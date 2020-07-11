const { assign } = require('@xstate/immer');
const { assign: assignX, actions, Machine, send, sendParent, spawn, forwardTo } = require('xstate');
const { gameMachine } = require('./GameMachine');
const { pure, choose, log } = actions;

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const socketCallback = (ctx, event) => (callback, onEvent) => {
  const { io } = ctx;
  io.on('connection', (socket) => {
    socket.on('event', (event) => {
      console.log('a user event', event);
      callback(event);
    });
  });

  onEvent((event) => {
    switch (event.type) {
      case 'joinRoom': {
        console.log('joinRoom', io.sockets.sockets[event.playerID]);
        const socket = io.sockets.sockets[event.playerID];
        socket.join(event.gameID);
        socket.to(event.gameID).emit('event', { type: 'yoza' });
      }
      case 'sendRoom': {
        socket.to(event.room).emit('event', event.payload);
      }
    }
    io.emit('event', event);
  });
  callback('SOCKET_CONNECTED');
  // socket.on('event', (event = {}) => {
  //   callback({ type: 'TO_PARENT', event });
  // });
};

const GameManagerMachine = Machine({
  id: 'gameManager',
  initial: 'initialising',
  context: {
    games: {},
    socket: undefined,
  },

  states: {
    initialising: {
      always: {
        target: 'connecting',
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
          target: 'ready',
        },
      },
    },
    ready: {
      entry: [() => console.log('ready')],
      on: {
        CREATE_GAME: {
          actions: [
            pure((ctx, event) => {
              let gameID = getRandomInt(1000, 9999);
              console.log('yoza');
              while (ctx.games[gameID]) {
                gameID = getRandomInt(1000, 9999);
              }
              return [
                assign((ctx, event) => {
                  ctx.games[gameID] = {
                    ref: spawn(gameMachine.withContext({ ...gameMachine.context, gameID, socket: ctx.socket })),
                  };
                }),
                send(
                  (ctx, event) => ({ type: 'CREATE_GAME', gameID, playerID: event.playerID, username: event.username }),
                  {
                    to: (ctx, event) => ctx.games[gameID].ref,
                  }
                ),
              ];
            }),
          ],
        },
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
