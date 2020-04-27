const { assign } = require('@xstate/immer');
const { actions, Machine, send, sendParent } = require('xstate');
// const wordList = require('../data/medium1');
const wordList = ['chees'];

var Pusher = require('pusher');

const { APP_ID: appId, KEY: key, SECRET: secret, CLUSTER: cluster } = process.env;

const pusher = new Pusher({
  appId,
  key,
  secret,
  cluster,
  useTLS: true,
});

const { log } = actions;

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

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
          actions: assign((ctx, event) => (ctx.gameID = event.gameID)),
        },
      },
    },
    connected: {
      invoke: {
        id: 'socket',
        src: (ctx, event) => (callback, onEvent) => {
          console.log('INVOKE GAME SOCKET', ctx.gameID);
          const channel = pusher.subscribe(`${ctx.gameID}-host-events`);
          channel.bind('events', async (event) => {
            console.log('GAME ', event);
            if (Array.isArray(event)) {
              event.forEach((event) => {
                callback({ type: 'TO_PARENT', event });
              });
            } else {
              callback({ type: 'TO_PARENT', event });
            }
          });

          onEvent(async (event) => {
            console.log('BROADCAST', event);
            const res = await fetch('/api/game', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ ...event, gameID: ctx.gameID }),
            });
            if (!res.ok) {
              console.error('event not sent');
            }
          });

          return () => pusher.unsubscribe(`${ctx.gameID}-host-events`);
        },
      },
      on: {
        // events from websocket to the game machine
        TO_PARENT: {
          actions: [
            sendParent((ctx, event) => {
              console.log('sent to machine, ', event, event.event);
              return event.event;
            }),
          ],
        },
        // events from the game machine to the websocket
        '*': {
          actions: send(
            (ctx, event) => {
              console.log('SEND TO PLAYER', event);
              return {
                ...event,
              };
            },
            { to: 'socket' }
          ),
        },
      },
    },
  },
});

const GameMachine = Machine({
  id: 'game',
  initial: 'ready',
  states: {
    ready: {
      on: {
        CREATE_GAME: {
          target: 'lobby',
        },
      },
    },
    lobby: {},
  },
});

exports.gameMachine = GameMachine;
