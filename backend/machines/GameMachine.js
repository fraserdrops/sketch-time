const { assign } = require('@xstate/immer');
const { actions, Machine, send, sendParent, spawn } = require('xstate');
const { playerMachine } = require('./PlayerMachine');

const { pure } = actions;
// const wordList = require('../data/medium1');
const wordList = ['chees'];

var PusherClient = require('pusher-js');
const fetch = require('node-fetch');

const { APP_ID: appId, KEY: key, SECRET: secret, CLUSTER: cluster } = process.env;

const pusherClient = new PusherClient(key, {
  cluster: 'ap4',
  forceTLS: true,
});

const { log } = actions;

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const Pusher = require('pusher');
const pusher = new Pusher({
  appId,
  key,
  secret,
  cluster,
});

const ClientMachine = Machine({
  id: 'client',
  initial: 'idle',
  context: {
    gameID: undefined,
    pusher,
  },
  states: {
    idle: {
      on: {
        CONNECT_TO_GAME: {
          target: 'connected',
          actions: assign((ctx, event) => (ctx.gameID = event.gameID)),
        },
      },
    },
    connected: {
      invoke: {
        id: 'socket',
        src: (ctx, event) => (callback, onEvent) => {
          const channel = pusherClient.subscribe(`${ctx.gameID}-host-events`);

          channel.bind('events', async (event) => {
            if (Array.isArray(event)) {
              event.forEach((event) => {
                callback({ type: 'TO_PARENT', event });
              });
            } else {
              callback({ type: 'TO_PARENT', event });
            }
          });

          onEvent(async (event) => {
            console.log('send events to player', event);
            pusher.trigger(`${event.gameID}-game-events`, 'events', event, (err) => {});
          });

          return () => pusher.unsubscribe(`${ctx.gameID}-host-events`);
        },
      },
      on: {
        // events from websocket to the game machine
        TO_PARENT: {
          actions: [
            sendParent((ctx, event) => {
              return event.event;
            }),
          ],
        },
        // events from the game machine to the websocket
        '*': {
          actions: send(
            (ctx, event) => {
              return {
                ...event,
              };
            },
            { to: 'socket' }
          ),
        },
      },
    },
  },
});

const spawnPlayer = assign((ctx, event) => {
  ctx.game.players[event.playerID] = {
    ref: spawn(
      playerMachine.withContext({
        ...playerMachine.context,
        playerID: event.playerID,
        gameID: event.gameID,
        username: event.username,
      })
    ),
    playerID: event.playerID,
    username: event.username,
  };
});

const sendJoinGame = send(
  (ctx, event) => ({ type: 'JOIN_GAME', gameID: event.gameID, playerID: event.playerID, host: true }),
  {
    to: (ctx, event) => ctx.game.players[ctx.hostID].ref,
  }
);

const GameMachine = Machine(
  {
    id: 'game',
    initial: 'ready',
    context: {
      gameID: undefined,
      hostID: undefined,
      game: {
        players: {},
        teams: {},
      },
      play: {
        currentPlayer: undefined,
        currentTeam: undefined,
        team1: {
          members: [],
          points: 0,
          lastPlayed: undefined,
        },
        team2: {
          members: [],
          points: 0,
          lastPlayed: undefined,
        },
      },
      pusher,
      playerRefs: {},
    },
    invoke: {
      id: 'client',
      src: ClientMachine,
    },
    states: {
      ready: {
        on: {
          CREATE_GAME: {
            target: 'lobby',
            actions: [
              'generateGameID',
              assign((ctx, event) => {
                ctx.hostID = event.playerID;
              }),
              send((ctx, event) => ({ type: 'CONNECT_TO_GAME', gameID: event.gameID }), { to: 'client' }),
              spawnPlayer,
              sendJoinGame,
              'broadcastGameState',
              // down here so that it's sent after the game and player are created
              // (ctx, event) => event.res.json({ gameID: event.gameID }),
            ],
          },
        },
      },
      lobby: {
        on: {
          START_GAME: {
            target: 'inGame',
            actions: ['broadcastStartGame', 'derivePlayState'],
            cond: 'playersFromBothTeams',
          },
          CHANGE_TEAM: {
            actions: [log(), assign((ctx, event) => (ctx.game.teams[event.userID] = event.team)), 'broadcastGameState'],
          },
          PLAYER_JOIN: {
            actions: [log(), spawnPlayer, sendJoinGame, 'broadcastGameState'],
          },
          GET_GAME_STATE: {
            actions: [log(), 'broadcastGameState'],
          },
        },
      },
      inGame: {
        initial: 'beforeTurn',
        states: {
          beforeTurn: {
            entry: ['broadcastBeforeTurn'],
            on: {
              START_TURN: {
                target: 'preTurn',
                actions: ['assignWord', 'setTeam', 'assignNextPlayer', 'broadcastPlayState', 'broadcastPreTurn'],
              },
            },
          },
          preTurn: {
            after: {
              100: 'playing',
            },
          },
          playing: {
            entry: ['broadcastTurn'],
            after: {
              60000: 'endOfTurn',
            },
            on: {
              END_TURN: {
                target: 'endOfTurn',
              },
            },
          },
          endOfTurn: {
            entry: ['broadcastEndOfTurn'],
            on: {
              SUCCESSFUL: {
                target: 'beforeTurn',
                actions: ['cleanupTurn', 'tallyPointsSuccess'],
              },
              UNSUCCESSFUL: {
                target: 'beforeTurn',
                actions: ['cleanupTurn'],
              },
            },
          },
        },
      },
    },
  },
  {
    actions: {
      tallyPointsSuccess: assign((ctx, event) => {
        ctx.play[ctx.play.currentTeam].points += 1;
      }),
      assignWord: assign((ctx, event) => (ctx.play.word = wordList[Math.floor(Math.random() * wordList.length)])),
      assignNextPlayer: assign((ctx, event) => {
        const { members, lastPlayed } = ctx.play[ctx.play.currentTeam];
        const lastPlayedIndex = members.indexOf(lastPlayed);
        const nextPlayerIndex = lastPlayedIndex + 1 >= members.length ? 0 : lastPlayedIndex + 1;
        const nextPlayer = members[nextPlayerIndex];
        ctx.play.currentPlayer = nextPlayer;
      }),
      setTeam: assign((ctx, event) => {
        ctx.play.currentTeam = ctx.play.currentTeam && ctx.play.currentTeam === 'team1' ? 'team2' : 'team1';
      }),
      cleanupTurn: assign((ctx, event) => {
        const { currentTeam, currentPlayer } = ctx.play;
        ctx.play[currentTeam].lastPlayed = currentPlayer;
      }),
      broadcastBeforeTurn: pure((ctx, event) => {
        // I could in theory broadcast this to all players at once
        // but instead I"m sending it through the player machine as an intermediary
        return Object.values(ctx.game.players).map(({ ref }) => {
          return send(
            {
              type: 'BEFORE_TURN',
              points: { team1: ctx.play.team1.points, team2: ctx.play.team2.points },
            },
            { to: ref }
          );
        });
      }),
      broadcastPreTurn: pure((context, event) => {
        // I could in theory broadcast this to all players at once
        // but instead I"m sending it through the player machine as an intermediary
        return Object.values(context.game.players).map(({ ref }) => {
          return send(
            (ctx, event) => ({
              type: 'PRE_TURN',
            }),
            { to: ref }
          );
        });
      }),
      broadcastTurn: pure((context, event) => {
        // I could in theory broadcast this to all players at once
        // but instead I"m sending it through the player machine as an intermediary
        return Object.values(context.game.players).map(({ ref }) => {
          return send(
            (ctx, event) => ({
              type: 'TURN',
            }),
            { to: ref }
          );
        });
      }),
      broadcastEndOfTurn: pure((context, event) => {
        // I could in theory broadcast this to all players at once
        // but instead I"m sending it through the player machine as an intermediary
        return Object.values(context.game.players).map(({ ref }) => {
          return send(
            (ctx, event) => ({
              type: 'END_OF_TURN',
            }),
            { to: ref }
          );
        });
      }),
      broadcastPlayState: pure((ctx, event) => {
        const { currentPlayer, team1, team2, currentTeam, word } = ctx.play;
        const playerDrawing = ctx.game.players[currentPlayer].username;

        const currentTeamData = currentTeam === 'team2' ? team2 : team1;
        const otherTeamData = currentTeam === 'team2' ? team1 : team2;
        return Object.values(ctx.game.players).map(({ ref, id }) => {
          let playerEvent;
          if (id === currentPlayer) {
            playerEvent = {
              type: 'DRAW',
              word,
            };
          } else if (currentTeamData.members.includes(id)) {
            playerEvent = {
              type: 'GUESS',
              playerDrawing: playerDrawing,
            };
          } else {
            playerEvent = {
              type: 'SPECTATE',
              playerDrawing: playerDrawing,
              word,
            };
          }
          return send((ctx, event) => ({ ...playerEvent, gameID: ctx.gameID }), { to: ref });
        });
      }),
      broadcastGameState: pure((context, event) => {
        // I could in theory broadcast this to all players at once
        // but instead I"m sending it through the player machine as an intermediary
        return Object.values(context.game.players).map(({ ref }) => {
          return send(
            (ctx, event) => ({
              type: 'GAME_UPDATE',
              gameID: ctx.gameID,
              game: ctx.game,
            }),
            { to: ref }
          );
        });
      }),
      broadcastStartGame: pure((context, event) => {
        // I could in theory broadcast this to all players at once
        // but instead I"m sending it through the player machine as an intermediary
        return Object.values(context.game.players).map(({ ref }) => {
          return send(
            (ctx, event) => ({
              type: 'START_GAME',
              gameID: ctx.gameID,
              game: ctx.game,
            }),
            { to: ref }
          );
        });
      }),
      derivePlayState: assign((ctx, event) => {
        ctx.play = {
          team1: {
            members: Object.keys(ctx.game.teams).filter((userID) => ctx.game.teams[userID] === 'Team 1'),
            lastPlayed: undefined,
            points: 0,
          },
          team2: {
            members: Object.keys(ctx.game.teams).filter((userID) => ctx.game.teams[userID] === 'Team 2'),
            lastPlayed: undefined,
            points: 0,
          },
        };
      }),
      generateGameID: assign((ctx, event) => (ctx.gameID = event.gameID)),
      changeTeam: assign((ctx, event) => (ctx.game.teams[event.userID] = event.team)),
    },
    guards: {
      playersFromBothTeams: (ctx, event) => {
        let team1 = false;
        let team2 = false;
        Object.values(ctx.game.teams).forEach((team) => {
          if (team === 'Team 1') {
            team1 = true;
          }

          if (team === 'Team 2') {
            team2 = true;
          }
        });
        return team1 && team2;
      },
    },
  }
);

exports.gameMachine = GameMachine;
