import { Machine, send, sendParent, forwardTo, actions, spawn } from 'xstate';
import { v4 as uuid } from 'uuid';
import { assign } from '@xstate/immer';
import io from 'socket.io-client';
const { log } = actions;

const saveLocal = (ctx, event, { state }) => {
  console.log('yodsfasd', state);
  let newState = { ...state };
  window.localStorage.setItem(ctx.gameID + '^' + ctx.id, JSON.stringify(newState));
};

const Socket = Machine({
  id: 'socketMachine',
  initial: 'idle',
  context: {
    username: undefined,
    gameID: undefined,
    io,
    socket: undefined,
  },
  states: {
    idle: {
      on: {
        START_CONNECTION: {
          target: 'active',
          actions: [assign((ctx, event) => (ctx.username = event.username))],
        },
      },
    },
    active: {
      initial: 'connecting',

      states: {
        connecting: {
          invoke: {
            id: 'connectToSocket',
            src: (ctx, event) => (callback, onEvent) => {
              const { io } = ctx;

              const socket = io('http://localhost:8000');
              socket.on('connect', () => {
                const playerId = socket.id;
                callback({ type: 'CONNECT', playerId, socket });
              });
            },
          },
          on: {
            CONNECT: {
              target: 'connected',
              actions: [
                assign((ctx, event) => {
                  ctx.playerId = event.playerId;
                  ctx.socket = event.socket;
                }),
                sendParent((ctx, event) => ({ type: 'SOCKET_CONNECTED', playerId: event.playerId })),
                (ctx, event) =>
                  event.socket.emit('event', { type: 'I_CONNECTED', playerId: event.playerId, username: ctx.username }),
              ],
            },
          },
        },
        connected: {
          invoke: {
            id: 'connectedSocket',
            src: (ctx, event) => (callback, onEvent) => {
              const { socket } = ctx;

              onEvent((event) => {
                socket.emit(event.type, event);
              });

              // add an event type here to allow sending to PlayerMachine
              const events = [
                'UPDATE_LOBBY',
                'INVITATION',
                'INVITE_ACCEPTED',
                'GETTING_GAME_READY',
                'GAME_READY',
                'GAME_UPDATE',
              ];
              events.forEach((type) => {
                socket.on(type, (message = {}) => {
                  const event = { type: type, ...message };
                  callback({ type: 'TO_PARENT', event });
                });
              });
            },
          },
          on: {
            TO_PARENT: {
              actions: [
                sendParent((ctx, event) => {
                  return event.event;
                }),
              ],
            },
            '*': {
              actions: send(
                (ctx, event) => {
                  return {
                    ...event,
                  };
                },
                { to: 'connectedSocket' }
              ),
            },
          },
        },
      },
    },
  },
});
const getGameState = send((ctx, event) => ({ type: 'GET_GAME_STATE', gameID: ctx.gameID, playerID: ctx.id }), {
  to: (ctx) => ctx.sockets.remotePlayer,
});

const PlayerMachine = Machine({
  id: 'player',
  initial: 'initial',
  context: {
    id: uuid(),
    username: undefined,
    team: undefined,
    gameID: undefined,
    potentialGameID: undefined,
    host: false,
    sockets: {},
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
    id: 'socket',
    src: Socket,
  },
  states: {
    initial: {
      on: {
        '': {
          target: 'connecting',
          actions: [send((ctx, event) => ({ type: 'START_CONNECTION', username: ctx.username }), { to: 'socket' })],
        },
      },
    },
    connecting: {
      on: {
        SOCKET_CONNECTED: {
          target: 'ready',
        },
      },
    },
    ready: {
      on: {
        UPDATE_USERNAME: {
          actions: assign((ctx, event) => (ctx.username = event.username)),
        },
        CREATE_GAME: {
          // target: 'creatingGame',
        },
        JOIN_GAME: {
          // target: 'joiningGame',
          actions: [
            assign((ctx, event) => {
              ctx.potentialGameID = event.gameID;
              ctx.host = false;
            }),
          ],
        },
      },
    },
    // creatingGame: {
    //   invoke: {
    //     id: 'creatingGame',
    //     src: (context, event) => {
    //       return fetch('http://localhost:8000/game', {
    //         method: 'POST',
    //         headers: {
    //           'Content-Type': 'application/json',
    //         },
    //         body: JSON.stringify({ type: 'CREATE_GAME', playerID: context.id, username: context.username }),
    //       }).then((res) => {
    //         if (res.ok) {
    //           return res.json();
    //         }
    //       });
    //     },
    //     onDone: {
    //       target: '#player.connectingToSockets',
    //       actions: assign((ctx, event) => {
    //         const { gameID } = event.data;
    //         ctx.potentialGameID = gameID;
    //         ctx.gameID = gameID;
    //         ctx.host = true;
    //       }),
    //     },
    //     onError: {
    //       target: '#player.ready.errorCreatingGame',
    //       actions: assign({ error: (context, event) => event.data }),
    //     },
    //   },
    // },
    // joiningGame: {
    //   entry: [log()],
    //   invoke: {
    //     id: 'joiningGame',
    //     src: (context, event) => {
    //       return fetch('http://localhost:8000/game', {
    //         method: 'POST',
    //         headers: {
    //           'Content-Type': 'application/json',
    //         },
    //         body: JSON.stringify({
    //           type: 'PLAYER_JOIN',
    //           gameID: context.potentialGameID,
    //           playerID: context.id,
    //           username: context.username,
    //         }),
    //       }).then((res) => {
    //         console.log(res);
    //         if (res.ok) {
    //         } else {
    //           throw new Error('FATALITY');
    //         }
    //       });
    //     },
    //     onError: {
    //       target: '#player.ready.errorJoiningGame',
    //       actions: console.log,
    //     },
    //     onDone: {
    //       target: '#player.connectingToSockets',
    //       actions: assign((ctx, event) => {
    //         ctx.gameID = ctx.potentialGameID;
    //         // const { gameID } = event.data;
    //         // ctx.gameID = gameID;
    //         // ctx.host = true;
    //       }),
    //     },
    //   },
    // },
    // lobby: {
    //   on: {
    //     // '*': {
    //     //   actions: saveLocal,
    //     // },
    //     START_GAME: {
    //       target: 'playing',
    //       actions: [assign((ctx, event) => (ctx.game = event.game))],
    //     },
    //     CHANGE_TEAM: {
    //       actions: [
    //         // saveLocal,
    //         () => console.log('sdkljfds'),
    //         send((ctx, event) => ({ ...event, gameID: ctx.gameID, type: 'CHANGE_TEAM' }), {
    //           to: (ctx) => ctx.sockets.remotePlayer,
    //         }),
    //       ],
    //     },
    //     GAME_UPDATE: {
    //       actions: [assign((ctx, event) => (ctx.game = event.game))],
    //     },
    //   },
    // },
    // playing: {
    //   type: 'parallel',
    //   states: {
    //     task: {
    //       initial: 'idle',
    //       states: {
    //         idle: {},
    //         drawing: {
    //           entry: [() => console.log('IM In drawing state')],
    //         },
    //         guessing: {},
    //         spectating: {},
    //       },
    //       on: {
    //         PLAY_UPDATE: {
    //           actions: [
    //             send((ctx, event) => {
    //               return event.playerEvents[ctx.id];
    //             }),
    //           ],
    //         },
    //         DRAW: {
    //           target: '.drawing',
    //           actions: [assign((ctx, event) => (ctx.play.word = event.word))],
    //         },
    //         GUESS: {
    //           target: '.guessing',
    //           actions: [assign((ctx, event) => (ctx.play.playerDrawing = event.playerDrawing))],
    //         },
    //         SPECTATE: {
    //           target: '.spectating',
    //           actions: [
    //             assign((ctx, event) => {
    //               ctx.play.word = event.word;
    //               ctx.play.playerDrawing = event.playerDrawing;
    //             }),
    //           ],
    //         },
    //       },
    //     },
    //     turn: {
    //       initial: 'beforeTurn',
    //       states: {
    //         beforeTurn: {
    //           entry: [saveLocal],

    //           on: {
    //             PRE_TURN: {
    //               target: 'preTurn',
    //             },
    //           },
    //         },
    //         preTurn: {
    //           entry: [saveLocal],
    //           invoke: {
    //             src: (context) => (cb) => {
    //               const interval = setInterval(() => {
    //                 cb('TICK');
    //               }, 1000 * context.preTurn.interval);

    //               return () => {
    //                 clearInterval(interval);
    //               };
    //             },
    //           },
    //           on: {
    //             TICK: {
    //               actions: assign((ctx, event) => {
    //                 ctx.preTurn.countdown = ctx.preTurn.countdown - ctx.preTurn.interval;
    //               }),
    //             },
    //             TURN: {
    //               target: 'inTurn',
    //               actions: assign((ctx, event) => {
    //                 ctx.preTurn.countdown = ctx.preTurn.duration;
    //               }),
    //             },
    //           },
    //         },
    //         inTurn: {
    //           entry: [saveLocal],
    //           invoke: {
    //             src: (context) => (cb) => {
    //               const interval = setInterval(() => {
    //                 cb('TICK');
    //               }, 1000 * context.turn.interval);

    //               return () => {
    //                 clearInterval(interval);
    //               };
    //             },
    //           },
    //           on: {
    //             TICK: {
    //               actions: assign((ctx, event) => {
    //                 ctx.turn.countdown = ctx.turn.countdown - ctx.turn.interval;
    //               }),
    //             },
    //             END_OF_TURN: {
    //               target: 'endOfTurn',
    //               actions: assign((ctx, event) => {
    //                 ctx.turn.countdown = ctx.turn.duration;
    //               }),
    //             },
    //           },
    //         },
    //         endOfTurn: {
    //           entry: [saveLocal],
    //           on: {
    //             BEFORE_TURN: {
    //               target: 'beforeTurn',
    //               actions: assign((ctx, event) => {
    //                 ctx.points = event.points;
    //               }),
    //             },
    //           },
    //         },
    //       },
    //     },
    //   },
    // },
  },
  actions: {},
});

export default PlayerMachine;
