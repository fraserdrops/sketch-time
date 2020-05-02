import { Machine, send, sendParent, forwardTo } from 'xstate';
import { v4 as uuid } from 'uuid';
import { assign } from '@xstate/immer';
import { pusher } from '../pages/_app';

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
          console.log('sub remote game');
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
            if (!res.ok) {
              console.error('event not sent');
            }
          });

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
          console.log('sub remote pplayer', `${context.gameID}-${context.playerID}-events`);

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

export const PlayerMachine = Machine({
  id: 'player',
  initial: 'ready',
  context: {
    id: uuid(),
    host: false,
    username: undefined,
    team: undefined,
    gameID: undefined,
    player: {
      host: false,
      state: 'ready',
    },
    game: {
      players: [],
      teams: {},
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
      on: {
        UPDATE_USERNAME: {
          actions: assign((ctx, event) => (ctx.username = event.username)),
        },
        CREATE_GAME: {
          actions: [
            () => console.log('creating game'),
            assign((ctx, event) => (ctx.gameID = event.gameID)),
            send((ctx, event) => ({ type: 'CONNECT_TO_GAME', gameID: event.gameID, playerID: ctx.id }), {
              to: 'remoteGame',
            }),
            send((ctx, event) => ({ type: 'CONNECT_TO_GAME', gameID: event.gameID, playerID: ctx.id }), {
              to: 'remotePlayer',
            }),
            send(
              (ctx, event) => ({
                type: 'CREATE_GAME',
                gameID: event.gameID,
                playerID: ctx.id,
                username: event.username,
              }),
              {
                to: 'remoteGame',
              }
            ),
          ],
        },
        JOIN_GAME: {
          // target: 'lobby',
          actions: [
            assign((ctx, event) => (ctx.gameID = event.gameID)),
            send((ctx, event) => ({ type: 'CONNECT_TO_GAME', gameID: event.gameID, playerID: ctx.id }), {
              to: 'remoteGame',
            }),
            send((ctx, event) => ({ type: 'CONNECT_TO_GAME', gameID: event.gameID, playerID: ctx.id }), {
              to: 'remotePlayer',
            }),
            send((ctx, event) => ({ ...event, type: 'PLAYER_JOIN' }), { to: 'remoteGame' }),
          ],
        },
        PLAYER_STATE_UPDATE: {
          actions: [
            assign((ctx, event) => {
              ctx.player = event.player;
              ctx.game = event.game;
            }),
          ],
        },
        '*': {
          actions: [forwardTo('remotePlayer')],
        },
      },
    },
  },
  actions: {},
});

export default PlayerMachine;
