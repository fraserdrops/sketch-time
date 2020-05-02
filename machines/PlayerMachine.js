const { actions, Machine, send, sendParent, spawn } = require('xstate');
const { v4: uuid } = require('uuid');
const { assign } = require('@xstate/immer');

var PusherClient = require('pusher-js');
const fetch = require('node-fetch');

const { APP_ID: appId, KEY: key, SECRET: secret, CLUSTER: cluster } = process.env;

const pusherClient = new PusherClient(key, {
  cluster: 'ap4',
  forceTLS: true,
});

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
    playerID: undefined,
    pusherClient,
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
        id: 'socket',
        src: (context, event) => (callback, onEvent) => {
          const channel = pusherClient.subscribe(`${context.gameID}-${context.playerID}-player-events`);
          console.log('client engaged');
          channel.bind('remoteEvents', async (event) => {
            console.log('RECIEVED FROM LOCAL PLAYER', event);
            if (Array.isArray(event)) {
              event.forEach((event) => {
                callback({ type: 'TO_PARENT', event });
              });
            } else {
              callback({ type: 'TO_PARENT', event });
            }
          });

          onEvent(async (event) => {
            console.log('REMOTE PLAYER TO LOCAL PLAYER', event, `${context.gameID}-${context.playerID}-events`);
            pusher.trigger(`${context.gameID}-${context.playerID}-events`, 'events', event, (err) => {});
          });

          return () => pusherClient.unsubscribe(`${context.gameID}-game-events`);
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
  invoke: {
    id: 'client',
    src: ClientMachine,
  },
  states: {
    ready: {
      on: {
        UPDATE_USERNAME: {
          actions: assign((ctx, event) => (ctx.username = event.username)),
        },
        JOIN_GAME: {
          target: 'lobby',
          actions: [
            assign((ctx, event) => {
              ctx.gameID = event.gameID;
              ctx.host = event.host;
            }),
            send((ctx, event) => ({ type: 'CONNECT_TO_GAME', gameID: event.gameID, playerID: ctx.id }), {
              to: 'client',
            }),
            (ctx) => console.log('YODSUFOISDUFO', ctx),
            send(
              (ctx, event) => ({
                type: 'PLAYER_STATE_UPDATE',
                player: {
                  host: ctx.host,
                  state: 'lobby',
                },
                game: ctx.game,
              }),
              { to: 'client' }
            ),
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
          actions: [sendParent((ctx, event) => ({ ...event, gameID: ctx.gameID, type: 'CHANGE_TEAM' }))],
        },
        GAME_UPDATE: {
          actions: [
            send(
              (ctx, event) => ({
                type: 'PLAYER_STATE_UPDATE',
                player: {
                  host: ctx.host,
                  state: 'lobby',
                },
                game: event.game,
              }),
              { to: 'client' }
            ),
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

exports.playerMachine = PlayerMachine;
