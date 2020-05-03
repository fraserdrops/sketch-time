import { Machine, send, sendParent, forwardTo } from 'xstate';
import { v4 as uuid } from 'uuid';
import { assign } from '@xstate/immer';
import { pusher } from '../pages/_app';

const RemoteGame = Machine({
  id: 'remoteGame',
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
        src: (context, event) => (callback, onEvent) => {
          const channel = pusher.subscribe(`${context.gameID}-game-events`);
          console.log('sub remote game');
          channel.bind('events', async (event) => {
            console.log('FROM GAME', event);
            if (Array.isArray(event)) {
              event.forEach((event) => {
                callback({ type: 'TO_PARENT', event });
              });
            } else {
              callback({ type: 'TO_PARENT', event });
            }
          });

          onEvent(async (event) => {
            console.log('PLAYER TO GAME', event);
            const res = await fetch('http://localhost:8000/game', {
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
        TO_PARENT: {
          actions: [
            sendParent((ctx, event) => {
              console.log('sent to machine, ', event, event.event);
              return event.event;
            }),
          ],
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

const RemotePlayer = Machine({
  id: 'remotePlayer',
  initial: 'idle',
  context: {
    gameID: undefined,
    playerID: undefined,
    pusher,
  },
  states: {
    idle: {
      on: {
        CONNECT_TO_GAME: {
          target: 'connected',
          actions: assign((ctx, event) => {
            ctx.gameID = event.gameID;
            ctx.playerID = event.playerID;
          }),
        },
      },
    },
    connected: {
      invoke: {
        id: 'remotePlayer',
        src: (context, event) => (callback, onEvent) => {
          const channel = pusher.subscribe(`${context.gameID}-${context.playerID}-events`);
          console.log('sub remote pplayer', `${context.gameID}-${context.playerID}-events`);

          channel.bind('events', async (event) => {
            console.log(' REMOTE PLAYER TO LOCAL PLAYER', event);
            if (Array.isArray(event)) {
              event.forEach((event) => {
                callback({ type: 'TO_PARENT', event });
              });
            } else {
              callback({ type: 'TO_PARENT', event });
            }
          });

          onEvent(async (event) => {
            console.log('LOCAL PLAYER TO REMOTE PLAYER', event, context.gameID, context.playerID);
            const res = await fetch('/api/player', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ ...event, gameID: context.gameID, playerID: context.playerID }),
            });
            if (!res.ok) {
              console.error('event not sent');
            }
          });

          return () => pusher.unsubscribe(`${context.gameID}-game-events`);
        },
      },
      on: {
        TO_PARENT: {
          actions: [
            sendParent((ctx, event) => {
              console.log('sent to machine, ', event, event.event);
              return event.event;
            }),
          ],
        },
        '*': {
          actions: send(
            (ctx, event) => ({
              ...event,
            }),
            { to: 'remotePlayer' }
          ),
        },
      },
    },
  },
});

const PlayerMachine = Machine({
  id: 'player',
  initial: 'ready',
  context: {
    id: uuid(),
    username: undefined,
    team: undefined,
    gameID: undefined,
    host: false,
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
  invoke: [
    {
      id: 'remoteGame',
      src: RemoteGame,
    },
    {
      id: 'remotePlayer',
      src: RemotePlayer,
    },
  ],
  states: {
    ready: {
      on: {
        UPDATE_USERNAME: {
          actions: assign((ctx, event) => (ctx.username = event.username)),
        },
        CREATE_GAME: {
          target: 'lobby',
          actions: [
            () => console.log('creating game'),
            assign((ctx, event) => {
              ctx.gameID = event.gameID;
              ctx.host = true;
            }),
            send((ctx, event) => ({ type: 'CONNECT_TO_GAME', gameID: event.gameID, playerID: ctx.id }), {
              to: 'remoteGame',
            }),
            send((ctx, event) => ({ type: 'CONNECT_TO_GAME', gameID: event.gameID, playerID: ctx.id }), {
              to: 'remotePlayer',
            }),
            send(
              (ctx, event) => ({
                type: 'CREATE_GAME',
                gameID: event.gameID,
                playerID: ctx.id,
                username: event.username,
              }),
              {
                to: 'remoteGame',
                delay: 1000,
              }
            ),
          ],
        },
        JOIN_GAME: {
          target: 'lobby',
          actions: [
            assign((ctx, event) => {
              ctx.gameID = event.gameID;
              ctx.host = event.host;
            }),
            send((ctx, event) => ({ type: 'CONNECT_TO_GAME', gameID: event.gameID, playerID: ctx.id }), {
              to: 'remoteGame',
            }),
            send((ctx, event) => ({ type: 'CONNECT_TO_GAME', gameID: event.gameID, playerID: ctx.id }), {
              to: 'remotePlayer',
            }),
            send((ctx, event) => ({ ...event, type: 'PLAYER_JOIN' }), { to: 'remoteGame', delay: 1000 }),
          ],
        },
      },
    },
    lobby: {
      on: {
        START_GAME: {
          target: 'playing',
          actions: [assign((ctx, event) => (ctx.game = event.game))],
        },
        CHANGE_TEAM: {
          actions: [
            send((ctx, event) => ({ ...event, gameID: ctx.gameID, type: 'CHANGE_TEAM' }), { to: 'remotePlayer' }),
          ],
        },
        GAME_UPDATE: {
          actions: [assign((ctx, event) => (ctx.game = event.game))],
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
                  return event.playerEvents[ctx.id];
                }),
              ],
            },
            DRAW: {
              target: '.drawing',
              actions: [assign((ctx, event) => (ctx.play.word = event.word))],
            },
            GUESS: {
              target: '.guessing',
              actions: [assign((ctx, event) => (ctx.play.playerDrawing = event.playerDrawing))],
            },
            SPECTATE: {
              target: '.spectating',
              actions: [
                assign((ctx, event) => {
                  ctx.play.word = event.word;
                  ctx.play.playerDrawing = event.playerDrawing;
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
                  actions: assign((ctx, event) => {
                    ctx.points.team1 = event.team1;
                    ctx.points.team2 = event.team2;
                  }),
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
                  actions: assign((ctx, event) => {
                    ctx.preTurn.countdown = ctx.preTurn.countdown - ctx.preTurn.interval;
                  }),
                },
                TURN: {
                  target: 'inTurn',
                  actions: assign((ctx, event) => {
                    ctx.preTurn.countdown = ctx.preTurn.duration;
                  }),
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
                  actions: assign((ctx, event) => {
                    ctx.turn.countdown = ctx.turn.countdown - ctx.turn.interval;
                  }),
                },
                END_OF_TURN: {
                  target: 'endOfTurn',
                  actions: assign((ctx, event) => {
                    ctx.turn.countdown = ctx.turn.duration;
                  }),
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
  actions: {},
});

export default PlayerMachine;
