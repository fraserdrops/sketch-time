import { Machine, assign, spawn, send, sendParent } from 'xstate';
import Pusher from 'pusher-js';
import PlayerMachine from './PlayerMachine';

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

let pusher = new Pusher('3a40fa337322e97d8d0c', {
  cluster: 'ap4',
  forceTLS: true,
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
          actions: assign({ gameID: (ctx, event) => event.gameID }),
        },
      },
    },
    connected: {
      invoke: {
        id: 'socket',
        src: (ctx, event) => (callback, onEvent) => {
          console.log('INVOKE GAME SOCKET', ctx.gameID);
          const channel = pusher.subscribe(`${ctx.gameID}-host-events`);
          channel.bind('events', async (event) => {
            console.log('GAME ', event);
            if (Array.isArray(event)) {
              event.forEach((event) => {
                callback({ type: 'TO_PARENT', event });
              });
            } else {
              callback({ type: 'TO_PARENT', event });
            }
          });

          onEvent(async (event) => {
            console.log('BROADCAST', event);
            setTimeout(async () => {
              const res = await fetch('/api/game', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(event),
              });
              if (!res.ok) {
                console.error('event not sent');
              }
            }, 1000);
          });

          return () => pusher.unsubscribe(`${ctx.gameID}-host-events`);
        },
      },
      on: {
        // events from websocket to the game machine
        TO_PARENT: {
          actions: [
            sendParent((ctx, event) => {
              console.log('sent to machine, ', event, event.event);
              return event.event;
            }),
          ],
        },
        // events from the game machine to the websocket
        '*': {
          actions: send(
            (ctx, event) => {
              console.log('SEND TO PLAYER', event);
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

const GameMachine = Machine(
  {
    id: 'game',
    initial: 'ready',
    context: {
      gameID: undefined,
      game: {
        players: [],
        teams: {},
      },
      play: {
        team1: {
          members: [],
        },
        team2: {
          members: [],
        },
      },
      pusher,
      playerRefs: [],
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
              send((ctx, event) => ({ type: 'CONNECT_TO_GAME', gameID: event.gameID }), { to: 'client' }),
            ],
          },
        },
      },
      lobby: {
        on: {
          START_GAME: { target: 'inGame', actions: ['broadcastStartGame', 'derivePlayState'] },
          CHANGE_TEAM: {
            actions: ['changeTeam', 'broadcastGameState'],
          },
          PLAYER_JOIN: {
            actions: ['joinGame', 'broadcastGameState'],
          },
        },
      },
      inGame: {
        initial: 'team1',
        states: {
          team1: {
            initial: 'ready',
            states: {
              ready: {
                after: {
                  10_000: 'playing',
                },
              },
              playing: {
                after: {
                  60_000: 'endOfTurn',
                },
              },
              endOfTurn: {
                type: 'final',
              },
            },
            entry: {},
            onDone: {
              target: 'team2',
            },
          },
          team2: {
            initial: 'ready',
            states: {
              ready: {
                after: {
                  10_000: 'playing',
                },
              },
              playing: {
                after: {
                  60_000: 'endOfTurn',
                },
              },
              endOfTurn: {
                type: 'final',
              },
            },
            entry: {},
            onDone: {
              target: 'team1',
            },
          },
        },
      },
    },
  },
  {
    actions: {
      log: (ctx, event) => console.log(event),
      broadcastGameState: send(
        (ctx, event) => ({
          type: 'GAME_UPDATE',
          gameID: ctx.gameID,
          game: ctx.game,
        }),
        { to: 'client' }
      ),
      broadcastStartGame: send(
        (ctx, event) => ({
          type: 'START_GAME',
          gameID: ctx.gameID,
          game: ctx.game,
        }),
        { to: 'client' }
      ),
      derivePlayState: assign({
        play: (ctx, event) => {
          return {
            team1: {
              members: Object.keys(ctx.game.teams).filter((userID) => ctx.game.teams[userID] === 'Team 1'),
              lastPlayed: undefined,
            },
            team2: {
              members: Object.keys(ctx.game.teams).filter((userID) => ctx.game.teams[userID] === 'Team 2'),
              lastPlayed: undefined,
            },
          };
        },
      }),
      generateGameID: assign({
        gameID: (ctx, event) => event.gameID,
      }),
      changeTeam: assign({
        game: (ctx, event) => {
          return {
            ...ctx.game,
            teams: { ...ctx.game.teams, [event.userID]: event.team },
          };
        },
      }),
      joinGame: assign({
        game: (ctx, event) => {
          return {
            ...ctx.game,
            players: { ...ctx.game.players, [event.userID]: { username: event.username } },
          };
        },
      }),
      playerRef: assign({
        playerRefs: (context, event) => [
          ...context.playerRefs,
          {
            player: event.player,
            // add a new todoMachine actor with a unique name
            ref: spawn(PlayerMachine.withContext(), `player-${event.id}`),
          },
        ],
      }),
    },
  }
);

export default GameMachine;
