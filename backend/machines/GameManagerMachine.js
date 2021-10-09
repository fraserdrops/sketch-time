const { assign } = require("@xstate/immer");
const {
  assign: assignX,
  actions,
  Machine,
  send,
  sendParent,
  spawn,
  forwardTo,
} = require("xstate");
const { gameMachine } = require("./GameMachine");
const { pure, choose, log } = actions;

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const socketCallback = (ctx, event) => (callback, onEvent) => {
  const { io } = ctx;
  io.on("connection", (socket) => {
    socket.on("event", (event) => {
      console.log("a user event", event);
      if (event.type === "SEND_DRAW_EVENT") {
        io.in(event.gameID).emit("event", { ...event, type: "DRAW_EVENT" });
      } else if (event.gameID) {
        console.log("game event");
        callback({ type: "GAME_EVENT", gameID: event.gameID, payload: event });
      } else {
        callback(event);
      }
    });
  });

  onEvent((event) => {
    console.log("event received", event);
    switch (event.type) {
      case "joinRoom": {
        const socket = io.sockets.sockets[event.playerID];
        socket.join(event.gameID);
        socket.to(event.gameID).emit("event", { type: "yoza" });
        break;
      }
      case "sendRoom": {
        console.log("sendRoom", event);
        io.in(event.room).emit("event", event.payload);
        break;
      }
      default: {
        io.emit("event", event);
      }
    }
  });
  callback("SOCKET_CONNECTED");
  console.log("socket ready");
  // socket.on('event', (event = {}) => {
  //   callback({ type: 'TO_PARENT', event });
  // });
};

const GameManagerMachine = Machine({
  id: "gameManager",
  initial: "initialising",
  context: {
    games: {},
    socket: undefined,
  },

  states: {
    initialising: {
      always: {
        target: "connecting",
        actions: [
          assignX({
            socket: (ctx, event) => spawn(socketCallback(ctx, event)),
          }),
        ],
      },
    },
    connecting: {
      on: {
        SOCKET_CONNECTED: {
          target: "ready",
        },
      },
    },
    ready: {
      entry: [() => console.log("ready")],
      on: {
        CREATE_GAME: {
          actions: [
            assignX({
              games: (ctx, event) => {
                let gameID = getRandomInt(1000, 9999);
                while (ctx.games[gameID]) {
                  gameID = getRandomInt(1000, 9999);
                }
                return {
                  ...ctx.games,
                  [gameID]: {
                    ref: spawn(
                      gameMachine.withContext({
                        ...gameMachine.context,
                        gameID,
                        hostID: event.playerID,
                        socket: ctx.socket,
                        game: {
                          players: {
                            [event.playerID]: {
                              playerID: event.playerID,
                              username: event.username,
                            },
                          },
                          teams: {},
                        },
                      })
                    ),
                  },
                };
              },
            }),
          ],
        },
        GAME_EVENT: [
          {
            cond: (ctx, event) => Boolean(ctx.games[event.gameID]),
            actions: [
              () => console.log("handling game event"),
              send((ctx, event) => ({ ...event.payload }), {
                to: (ctx, event) => ctx.games[event.gameID].ref,
              }),
            ],
          },
          {
            actions: [
              send(
                (ctx, event) => ({
                  type: "sendRoom",
                  room: event.payload.playerID,
                  payload: {
                    type: "INVALID_GAME_CODE",
                  },
                }),
                {
                  to: (ctx, event) => ctx.socket,
                }
              ),
            ],
          },
        ],
        // '*': {
        //   actions: [
        //     choose([
        //       // check game exists
        //       {
        //         cond: (ctx, event) => Boolean(ctx.games[event.gameID]),
        //         actions: [
        //           (ctx, event) => event.res.status(200).end(),
        //           forwardTo((ctx, event) => ctx.games[event.gameID].ref),
        //         ],
        //       },
        //       {
        //         // send error
        //         actions: [
        //           log(),
        //           (ctx, event) => {
        //             event.res.statusMessage = 'No Game Matching ID';
        //             event.res.status(400).end();
        //           },
        //         ],
        //       },
        //     ]),
        //   ],
        // },
      },
    },
  },
});

exports.gameManagerMachine = GameManagerMachine;
