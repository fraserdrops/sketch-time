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
              const host =
                process.env.NODE_ENV === 'production'
                  ? 'https://sketch-time-server.herokuapp.com/'
                  : 'http://localhost:8000';
              console.log(host);
              const socket = io(host);
              socket.on('connect', () => {
                const playerID = socket.id;
                callback({ type: 'CONNECT', playerID, socket });
              });
            },
          },
          on: {
            CONNECT: {
              target: 'connected',
              actions: [
                assign((ctx, event) => {
                  ctx.playerID = event.playerID;
                  ctx.socket = event.socket;
                }),
                sendParent((ctx, event) => ({ type: 'SOCKET_CONNECTED', playerID: event.playerID })),
                (ctx, event) =>
                  event.socket.emit('event', {
                    type: 'PLAYER_CONNECTED',
                    playerID: event.playerID,
                    username: ctx.username,
                  }),
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
                console.log('sending to socket', event);
                socket.emit('event', event);
              });

              socket.on('event', (event = {}) => {
                console.log(event);
                callback({ type: 'TO_PARENT', event });
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

const clearCanvas = (ctx) => ctx.canvasCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);

const updateDrawingPosition = assign((ctx, event) => {
  ctx.previous = ctx.current;
  ctx.current = event.current;
});

function drawLine(ctx, event) {
  const canvasCtx = ctx.canvasCtx;
  if (ctx.current && ctx.previous) {
    canvasCtx.beginPath();
    canvasCtx.moveTo(ctx.previous.x, ctx.previous.y);
    canvasCtx.lineTo(ctx.current.x, ctx.current.y);
    canvasCtx.strokeStyle = 'black';
    canvasCtx.lineWidth = 2;
    canvasCtx.stroke();
    canvasCtx.closePath();
  }
}

const PlayerMachine = Machine({
  id: 'player',
  initial: 'initial',
  context: {
    playerId: undefined,
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
    canvasCtx: undefined,
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
          actions: [assign((ctx, event) => (ctx.playerID = event.playerID))],
        },
      },
    },
    ready: {
      on: {
        UPDATE_USERNAME: {
          actions: assign((ctx, event) => (ctx.username = event.username)),
        },
        CREATE_GAME: {
          target: 'joiningGame',
          actions: [
            assign((ctx, event) => (ctx.host = true)),
            send((ctx, event) => ({ type: 'CREATE_GAME', playerID: ctx.playerID, username: ctx.username }), {
              to: 'socket',
            }),
          ],
          // target: 'creatingGame',
        },
        JOIN_GAME: {
          target: 'joiningGame',
          actions: [
            send(
              (ctx, event) => ({
                type: 'PLAYER_JOIN',
                playerID: ctx.playerID,
                username: ctx.username,
                gameID: event.gameID,
              }),
              {
                to: 'socket',
              }
            ),
            assign((ctx, event) => {
              ctx.potentialGameID = event.gameID;
              ctx.host = false;
            }),
          ],
        },
      },
    },
    joiningGame: {
      on: {
        JOINED_GAME: {
          actions: [
            assign((ctx, event) => {
              ctx.game = event.gameState;
              ctx.gameID = event.gameID;
            }),
          ],
          target: 'lobby',
        },
      },
    },
    lobby: {
      on: {
        // '*': {
        //   actions: saveLocal,
        // },
        REQUEST_START_GAME: {
          actions: [
            send(
              (ctx, event) => ({
                type: 'REQUEST_START_GAME',
                gameID: ctx.gameID,
              }),
              {
                to: 'socket',
              }
            ),
          ],
        },
        START_GAME: {
          target: 'playing',
          actions: [
            assign((ctx, event) => {
              ctx.game = event.game;
            }),
          ],
        },
        CHANGE_TEAM: {
          actions: [
            send((ctx, event) => ({ ...event, gameID: ctx.gameID, type: 'CHANGE_TEAM', playerID: ctx.playerID }), {
              to: 'socket',
            }),
          ],
        },
        GAME_UPDATE: {
          actions: [assign((ctx, event) => (ctx.game = event.game))],
        },
      },
    },
    playing: {
      type: 'parallel',
      // exit: [clearCanvas],
      states: {
        task: {
          initial: 'idle',
          states: {
            idle: {},
            drawing: {
              initial: 'idle',
              states: {
                idle: {
                  on: {
                    MOUSE_DOWN: {
                      target: 'active',
                      actions: [assign((ctx, event) => (ctx.current = event.current))],
                    },
                  },
                },
                active: {
                  on: {
                    MOUSE_MOVE: {
                      actions: [
                        updateDrawingPosition,
                        drawLine,
                        send(
                          (ctx) => ({
                            type: 'SEND_DRAW_EVENT',
                            gameID: ctx.gameID,
                            current: ctx.current,
                            previous: ctx.previous,
                          }),
                          {
                            to: 'socket',
                          }
                        ),
                      ],
                    },
                    MOUSE_UP: {
                      target: 'idle',
                      actions: {
                        actions: [
                          updateDrawingPosition,
                          drawLine,
                          send(
                            (ctx) => ({
                              type: 'SEND_DRAW_EVENT',
                              gameID: ctx.gameID,
                              current: ctx.current,
                              previous: ctx.previous,
                            }),
                            {
                              to: 'socket',
                            }
                          ),
                        ],
                      },
                    },
                  },
                },
              },
            },
            guessing: {
              on: {
                DRAW_EVENT: {
                  actions: [updateDrawingPosition, drawLine],
                },
              },
            },
            spectating: {
              on: {
                DRAW_EVENT: {
                  actions: [updateDrawingPosition, drawLine],
                },
              },
            },
          },
          on: {
            '*': {
              actions: [(ctx, event) => console.log('LKJLAKF', ctx, event)],
            },
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
            SET_CANVAS_CTX: {
              actions: [
                assign((ctx, event) => {
                  ctx.canvasCtx = event.canvasCtx;
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
                START_TURN: {
                  actions: [
                    send(
                      (ctx, event) => ({
                        type: 'START_TURN',
                        gameID: ctx.gameID,
                      }),
                      {
                        to: 'socket',
                      }
                    ),
                  ],
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
              // entry: [saveLocal],
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
                END_TURN: {
                  actions: [
                    send(
                      (ctx, event) => ({
                        type: 'END_TURN',
                        gameID: ctx.gameID,
                      }),
                      {
                        to: 'socket',
                      }
                    ),
                  ],
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
              // entry: [saveLocal],
              on: {
                SUCCESSFUL: {
                  actions: [
                    send(
                      (ctx, event) => ({
                        type: 'SUCCESSFUL',
                        gameID: ctx.gameID,
                      }),
                      {
                        to: 'socket',
                      }
                    ),
                  ],
                },
                UNSUCCESSFUL: {
                  actions: [
                    send(
                      (ctx, event) => ({
                        type: 'UNSUCCESSFUL',
                        gameID: ctx.gameID,
                      }),
                      {
                        to: 'socket',
                      }
                    ),
                  ],
                },
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
