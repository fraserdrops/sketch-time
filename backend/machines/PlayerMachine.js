const { actions, Machine, send, sendParent, spawn } = require('xstate');
const { v4: uuid } = require('uuid');
const { assign } = require('@xstate/immer');
const { log } = actions;

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
    idle: {},
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
        (ctx, event) => ({
          ...event,
        }),
        { to: 'socket' }
      ),
    },
  },
  invoke: {
    id: 'socket',
    src: (context, event) => (callback, onEvent) => {
      const channel = pusherClient.subscribe(`${context.gameID}-${context.playerID}-player-events`);
      channel.bind('remoteEvents', async (event) => {
        if (Array.isArray(event)) {
          event.forEach((event) => {
            callback({ type: 'TO_PARENT', event });
          });
        } else {
          callback({ type: 'TO_PARENT', event });
        }
      });

      onEvent(async (event) => {
        console.log('REMOTE PLAYER TO LOCAL', event);
        pusher.trigger(`${context.gameID}-${context.playerID}-events`, 'events', event, (err) => {});
      });

      return () => pusherClient.unsubscribe(`${context.gameID}-game-events`);
    },
  },
});

exports.playerMachine = ClientMachine;
