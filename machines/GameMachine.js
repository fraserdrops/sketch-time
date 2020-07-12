const { assign } = require('@xstate/immer');
const { actions, Machine, send, sendParent, spawn } = require('xstate');

const { pure } = actions;
// const wordList = require('../data/medium1');
const wordList = ['chees'];

const { APP_ID: appId, KEY: key, SECRET: secret, CLUSTER: cluster } = process.env;

const { log } = actions;

const spawnPlayer = assign((ctx, event) => {
  ctx.game.players[event.playerID] = {
    playerID: event.playerID,
    username: event.username,
  };
});

const sendGameCreated = send(
  (ctx, event) => ({
    type: 'sendRoom',
    room: ctx.hostID,
    payload: { type: 'JOINED_GAME', gameState: ctx.game, gameID: ctx.gameID, playerID: ctx.hostID, host: true },
  }),
  {
    to: (ctx, event) => ctx.socket,
  }
);

const sendJoinGame = send(
  (ctx, event) => ({
    type: 'sendRoom',
    room: event.playerID,
    payload: { type: 'JOINED_GAME', gameState: ctx.game, gameID: ctx.gameID, playerID: event.playerID, host: false },
  }),
  {
    to: (ctx, event) => ctx.socket,
  }
);

const joinRoom = send((ctx, event) => ({ type: 'joinRoom', playerID: event.playerID, gameID: ctx.gameID }), {
  to: (ctx) => ctx.socket,
});

const hostJoin = send((ctx, event) => ({ type: 'joinRoom', playerID: ctx.hostID, gameID: ctx.gameID }), {
  to: (ctx) => ctx.socket,
});

const GameMachine = Machine(
  {
    id: 'game',
    initial: 'init',
    context: {
      gameID: undefined,
      hostID: undefined,
      count: 0,
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
      playerRefs: {},
    },
    states: {
      init: {
        always: {
          target: 'lobby',
          actions: [hostJoin, sendGameCreated],
        },
      },
      lobby: {
        on: {
          REQUEST_START_GAME: {
            target: 'inGame',
            actions: ['broadcastStartGame', 'derivePlayState'],
            cond: 'playersFromBothTeams',
          },
          CHANGE_TEAM: {
            actions: [assign((ctx, event) => (ctx.game.teams[event.playerID] = event.team)), 'broadcastGameState'],
          },
          PLAYER_JOIN: {
            actions: [log(), joinRoom, spawnPlayer, sendJoinGame, 'broadcastGameState'],
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
      broadcastGameState: send(
        (ctx, event) => ({
          type: 'sendRoom',
          room: ctx.gameID,
          payload: {
            type: 'GAME_UPDATE',
            gameID: ctx.gameID,
            game: ctx.game,
          },
        }),
        { to: (ctx) => ctx.socket }
      ),

      broadcastStartGame: send(
        (ctx, event) => ({
          type: 'sendRoom',
          room: ctx.gameID,
          payload: {
            type: 'START_GAME',
            game: ctx.game,
          },
        }),
        { to: (ctx) => ctx.socket }
      ),
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
