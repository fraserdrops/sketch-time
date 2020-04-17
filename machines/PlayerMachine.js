import { Machine, assign, send, sendParent } from 'xstate';
import { v4 as uuid } from 'uuid';
import Pusher from 'pusher-js';
import { pusher } from '../pages/_app';

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
        src: (context, event) => (callback, onEvent) => {
          const channel = pusher.subscribe(`${context.gameID}-game-events`);
          channel.bind('events', async (event) => {
            console.log('FROM GAME', event);
            if (Array.isArray(event)) {
              event.forEach((event) => {
                callback(event);
              });
            } else {
              callback(event);
            }
          });

          onEvent(async (event) => {
            console.log('PLAYER TO GAME', event);
            const res = await fetch('/api/host', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ ...event, gameID: context.gameID }),
            });
            if (!res.ok) {
              console.error('event not sent');
            }
          });

          return () => pusher.unsubscribe(`${context.gameID}-game-events`);
        },
      },
      on: {
        GAME_UPDATE: {
          actions: [sendParent((ctx, event) => event)],
        },
        START_GAME: {
          actions: [sendParent((ctx, event) => event)],
        },
        TEAM_1_TURN: {
          actions: [
            sendParent((ctx, event) => {
              console.log('TEAM  1 TURN RECEIVED', event);
              return { ...event, type: 'PLAY_UPDATE' };
            }),
          ],
        },
        BEFORE_TURN: {
          actions: [sendParent((ctx, event) => event)],
        },
        PRE_TURN: {
          actions: [sendParent((ctx, event) => event)],
        },
        TURN: {
          actions: [sendParent((ctx, event) => event)],
        },
        END_OF_TURN: {
          actions: [sendParent((ctx, event) => event)],
        },
        POINTS_UPDATE: {
          actions: [sendParent((ctx, event) => event)],
        },
        '*': {
          actions: send(
            (ctx, event) => ({
              ...event,
            }),
            { to: 'socket' }
          ),
        },
      },
    },
  },
});

export const PlayerMachine = Machine({
  id: 'player',
  initial: 'ready',
  context: {
    id: uuid(),
    username: undefined,
    team: undefined,
    gameID: undefined,
    game: {
      players: [],
      teams: {},
    },
    play: {
      word: undefined,
    },
    points: {
      team1: 0,
      team2: 0,
    },
    preTurn: {
      countdown: 15,
      duration: 15,
      interval: 1,
    },
    turn: {
      countdown: 60,
      duration: 60,
      interval: 1,
    },
  },
  invoke: {
    id: 'client',
    src: ClientMachine,
  },
  states: {
    ready: {
      on: {
        UPDATE_USERNAME: {
          actions: assign({
            username: (ctx, event) => event.username,
          }),
        },
        JOIN_GAME: {
          target: 'lobby',
          actions: [
            assign({ gameID: (ctx, event) => event.gameID }),
            send((ctx, event) => ({ type: 'CONNECT_TO_GAME', gameID: event.gameID }), { to: 'client' }),
            send((ctx, event) => ({ ...event, type: 'PLAYER_JOIN' }), { to: 'client' }),
          ],
        },
      },
    },
    lobby: {
      on: {
        START_GAME: {
          target: 'playing',
          actions: [
            assign({
              game: (ctx, event) => {
                return event.game;
              },
            }),
          ],
        },
        CHANGE_TEAM: {
          actions: [send((ctx, event) => ({ ...event, gameID: ctx.gameID, type: 'CHANGE_TEAM' }), { to: 'client' })],
        },
        GAME_UPDATE: {
          actions: [
            assign({
              game: (ctx, event) => {
                return event.game;
              },
            }),
          ],
        },
      },
    },
    playing: {
      type: 'parallel',
      states: {
        task: {
          initial: 'idle',
          states: {
            idle: {},
            drawing: {
              entry: [() => console.log('IM In drawing state')],
            },
            guessing: {},
            spectating: {},
          },
          on: {
            PLAY_UPDATE: {
              actions: [
                send((ctx, event) => {
                  console.log('PLAY UPDATE', event);
                  return event.playerEvents[ctx.id];
                }),
              ],
            },
            DRAW: {
              target: '.drawing',
              actions: [
                () => console.log('IM DRAWING'),
                assign({
                  play: (ctx, event) => {
                    console.log(event);
                    return { ...ctx.play, word: event.word };
                  },
                }),
              ],
            },
            GUESS: {
              target: '.guessing',
              actions: [
                assign({
                  play: (ctx, event) => {
                    console.log(event);
                    return { ...ctx.play, playerDrawing: event.playerDrawing };
                  },
                }),
              ],
            },
            SPECTATE: {
              target: '.spectating',
              actions: [
                assign({
                  play: (ctx, event) => {
                    console.log(event);
                    return { ...ctx.play, word: event.word, playerDrawing: event.playerDrawing };
                  },
                }),
              ],
            },
          },
        },
        turn: {
          initial: 'beforeTurn',
          states: {
            beforeTurn: {
              on: {
                POINTS_UPDATE: {
                  actions: assign({ points: (ctx, event) => ({ team1: event.team1, team2: event.team2 }) }),
                },
                PRE_TURN: {
                  target: 'preTurn',
                },
              },
            },
            preTurn: {
              invoke: {
                src: (context) => (cb) => {
                  const interval = setInterval(() => {
                    cb('TICK');
                  }, 1000 * context.preTurn.interval);

                  return () => {
                    clearInterval(interval);
                  };
                },
              },
              on: {
                TICK: {
                  actions: assign({
                    preTurn: (context) => ({
                      ...context.preTurn,
                      countdown: context.preTurn.countdown - context.preTurn.interval,
                    }),
                  }),
                },
                TURN: {
                  target: 'inTurn',
                  actions: assign({ preTurn: (ctx) => ({ ...ctx.preTurn, countdown: ctx.preTurn.duration }) }),
                },
              },
            },
            inTurn: {
              invoke: {
                src: (context) => (cb) => {
                  const interval = setInterval(() => {
                    cb('TICK');
                  }, 1000 * context.turn.interval);

                  return () => {
                    clearInterval(interval);
                  };
                },
              },
              on: {
                TICK: {
                  actions: assign({
                    turn: (context) => ({
                      ...context.turn,
                      countdown: context.turn.countdown - context.turn.interval,
                    }),
                  }),
                },
                END_OF_TURN: {
                  target: 'endOfTurn',
                  actions: assign({ turn: (ctx) => ({ ...ctx.turn, countdown: ctx.turn.duration }) }),
                },
              },
            },
            endOfTurn: {
              on: {
                BEFORE_TURN: {
                  target: 'beforeTurn',
                },
              },
            },
          },
          on: {
            BEFORE_TURN: {
              target: '.beforeTurn',
            },
            PRE_TURN: {
              target: '.preTurn',
            },
            TURN: {
              target: '.inTurn',
            },
          },
        },
      },
    },
  },
  actions: {
    connectToGame: send('CONNECT_TO_GAME', { to: 'client' }),
    updateUsername: assign({
      username: (ctx, event) => event.username,
    }),
    updateGame: assign({
      game: (ctx, event) => {
        return event.game;
      },
    }),
    subscribeToGameChannel: assign({
      gameID: (ctx, event) => ctx.pusher.subscribe(`${ctx.gameID}-host-events`),
    }),
    changeTeam: assign({
      teams: (ctx, event) => ({ ...ctx.teams, [event.userID]: event.team }),
    }),
    joinGame: assign({
      players: (ctx, event) => ({
        ...ctx.players,
        [event.userID]: { username: event.username },
      }),
    }),
  },
});

export default PlayerMachine;
