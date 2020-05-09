import { Machine, send, sendParent, forwardTo, actions } from 'xstate';
import { v4 as uuid } from 'uuid';
import { assign } from '@xstate/immer';
import { pusher } from '../pages/_app';
const { log } = actions;

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
            if (res.ok) {
              res.json().then((json) => {
                console.log(json);
              });
            }
          });

          callback({ type: 'TO_PARENT', event: { type: 'GAME_SOCKET_CONNECTED' } });

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

          callback({ type: 'TO_PARENT', event: { type: 'PLAYER_SOCKET_CONNECTED' } });

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

const getGameState = send((ctx, event) => ({ type: 'GET_GAME_STATE', gameID: ctx.gameID, playerID: ctx.id }), {
  to: 'remotePlayer',
});

const PlayerMachine = Machine({
  id: 'player',
  initial: 'ready',
  context: {
    id: uuid(),
    username: undefined,
    team: undefined,
    gameID: undefined,
    potentialGameID: undefined,
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
      inital: 'ok',
      states: {
        ok: {},
        errorJoiningGame: {},
        errorCreatingGame: {},
      },
      on: {
        UPDATE_USERNAME: {
          actions: assign((ctx, event) => (ctx.username = event.username)),
        },
        CREATE_GAME: {
          target: 'creatingGame',
        },
        JOIN_GAME: {
          target: 'joiningGame',
          actions: [
            assign((ctx, event) => {
              ctx.potentialGameID = event.gameID;
              ctx.host = false;
            }),
          ],
        },
      },
    },
    creatingGame: {
      invoke: {
        id: 'creatingGame',
        src: (context, event) => {
          return fetch('http://localhost:8000/game', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ type: 'CREATE_GAME', playerID: context.id, username: context.username }),
          }).then((res) => {
            if (res.ok) {
              return res.json();
            }
          });
        },
        onDone: {
          target: '#player.connectingToSockets',
          actions: assign((ctx, event) => {
            const { gameID } = event.data;
            ctx.potentialGameID = gameID;
            ctx.gameID = gameID;
            ctx.host = true;
          }),
        },
        onError: {
          target: '#player.ready.errorCreatingGame',
          actions: assign({ error: (context, event) => event.data }),
        },
      },
    },
    joiningGame: {
      entry: [log()],
      invoke: {
        id: 'joiningGame',
        src: (context, event) => {
          return fetch('http://localhost:8000/game', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'PLAYER_JOIN',
              gameID: context.potentialGameID,
              playerID: context.id,
              username: context.username,
            }),
          }).then((res) => {
            console.log(res);
            if (res.ok) {
            } else {
              throw new Error('FATALITY');
            }
          });
        },
        onError: {
          target: '#player.ready.errorJoiningGame',
          actions: console.log,
        },
        onDone: {
          target: '#player.connectingToSockets',
          actions: assign((ctx, event) => {
            ctx.gameID = ctx.potentialGameID;
            // const { gameID } = event.data;
            // ctx.gameID = gameID;
            // ctx.host = true;
          }),
        },
        // onError: {
        //   target: '#player.ready.errorJoiningGame',
        //   actions: [() => console.log('ERROR'), assign({ error: (context, event) => event.data })],
        // },
      },
    },
    connectingToSockets: {
      type: 'parallel',
      states: {
        connectingToGameSocket: {
          initial: 'pending',
          states: {
            pending: {
              entry: [
                log(),
                send((ctx, event) => ({ type: 'CONNECT_TO_GAME', gameID: ctx.gameID, playerID: ctx.id }), {
                  to: 'remoteGame',
                }),
              ],
              on: {
                GAME_SOCKET_CONNECTED: 'connected',
              },
            },
            connected: {
              type: 'final',
            },
          },
        },
        connectingToPlayerSocket: {
          initial: 'pending',
          states: {
            pending: {
              entry: [
                send((ctx, event) => ({ type: 'CONNECT_TO_GAME', gameID: ctx.gameID, playerID: ctx.id }), {
                  to: 'remotePlayer',
                }),
              ],
              on: {
                PLAYER_SOCKET_CONNECTED: 'connected',
              },
            },
            connected: {
              type: 'final',
            },
          },
        },
      },
      onDone: {
        actions: [getGameState],
        target: 'lobby',
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
                  actions: assign((ctx, event) => {
                    ctx.points = event.points;
                  }),
                },
              },
            },
          },
        },
      },
    },
  },
  actions: {},
});

export default PlayerMachine;
