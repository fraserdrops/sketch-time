const { assign } = require('@xstate/immer');
const { actions, Machine, send, sendParent, spawn, forwardTo } = require('xstate');
const { gameMachine } = require('./GameMachine');
const { pure } = actions;

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const handlePlayerCreateOrJoin = pure((ctx, event) => {
  const { gameID } = event;
  return [
    assign((ctx, event) => {
      ctx.games[gameID] = {
        ref: spawn(gameMachine.withContext({ ...gameMachine.context, gameID })),
      };
    }),
    forwardTo(ctx.games[gameID].ref),
  ];
});

const GameManagerMachine = Machine({
  id: 'gameManager',
  initial: 'ready',
  context: {
    games: {},
  },
  states: {
    ready: {
      on: {
        CREATE_GAME: {
          actions: [
            assign((ctx, event) => {
              ctx.games[event.gameID] = {
                ref: spawn(gameMachine.withContext({ ...gameMachine.context, gameID: event.gameID })),
              };
            }),
            forwardTo((ctx, event) => ctx.games[event.gameID].ref),
          ],
        },
        '*': {
          actions: [forwardTo((ctx, event) => ctx.games[event.gameID].ref)],
        },
      },
    },
  },
});

exports.gameManagerMachine = GameManagerMachine;
