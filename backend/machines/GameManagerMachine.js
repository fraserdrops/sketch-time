const { assign } = require('@xstate/immer');
const { actions, Machine, send, sendParent, spawn, forwardTo } = require('xstate');
const { gameMachine } = require('./GameMachine');
const { pure, choose, log } = actions;

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const GameManagerMachine = Machine({
  id: 'gameManager',
  initial: 'ready',
  context: {
    games: {},
  },
  invoke: {
    id: 'socket',
    src: (ctx, event) => (callback, onEvent) => {
      const { io } = ctx;
      io.on('connection', (socket) => {
        console.log('connected');

        socket.on('event', (event) => {
          console.log('a user event', event);
          callback(event);
        });
      });

      // onEvent((event) => {
      //   io.emit('event', event);
      // });

      // socket.on('event', (event = {}) => {
      //   callback({ type: 'TO_PARENT', event });
      // });
    },
  },
  states: {
    ready: {
      on: {
        CREATE_GAME: {
          actions: [
            pure((ctx, event) => {
              let gameID = getRandomInt(1000, 9999);

              while (ctx.games[gameID]) {
                gameID = getRandomInt(1000, 9999);
              }
              return [
                assign((ctx, event) => {
                  ctx.games[gameID] = {
                    ref: spawn(gameMachine.withContext({ ...gameMachine.context, gameID })),
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
