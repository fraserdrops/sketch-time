import { Machine, assign, send, sendParent } from 'xstate';
import { v4 as uuid } from 'uuid';
import Pusher from 'pusher-js';

let pusher = new Pusher('3a40fa337322e97d8d0c', {
  cluster: 'ap4',
  forceTLS: true,
});

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
          actions: assign({ gameID: (ctx, event) => event.gameID }),
        },
      },
    },
    connected: {
      invoke: {
        id: 'socket',
        src: (context, event) => (callback, onEvent) => {
          const channel = pusher.subscribe(`${context.gameID}-game-events`);
          channel.bind('events', async (event) => {
            if (Array.isArray(event)) {
              event.forEach((event) => {
                callback({ type: 'GAME_UPDATE', game: event.game });
              });
            } else {
              callback({ type: 'GAME_UPDATE', game: event.game });
            }
          });

          onEvent(async (event) => {
            const res = await fetch('/api/host', {
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
        },
      },
      on: {
        GAME_UPDATE: {
          actions: [
            sendParent((ctx, event) => {
              return {
                type: 'GAME_UPDATE',
                game: event.game,
              };
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

export const PlayerMachine = Machine({
  id: 'player',
  initial: 'ready',
  context: {
    id: uuid(),
    username: undefined,
    team: undefined,
    game: {
      players: [],
      teams: {},
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
          actions: assign({
            username: (ctx, event) => event.username,
          }),
        },
        JOIN_GAME: {
          target: 'lobby',
          actions: [
            send((ctx, event) => ({ type: 'CONNECT_TO_GAME', gameID: event.gameID }), { to: 'client' }),
            send((ctx, event) => ({ ...event, type: 'PLAYER_JOIN' }), { to: 'client' }),
          ],
        },
      },
    },
    lobby: {
      on: {
        START_GAME: { target: 'playing', actions: [] },
        CHANGE_TEAM: {
          actions: [send((ctx, event) => ({ ...event, gameID: ctx.gameID, type: 'CHANGE_TEAM' }), { to: 'client' })],
        },
        GAME_UPDATE: {
          actions: [
            assign({
              game: (ctx, event) => {
                return event.game;
              },
            }),
          ],
        },
      },
    },
    playing: {},
  },
  actions: {
    connectToGame: send('CONNECT_TO_GAME', { to: 'client' }),
    updateUsername: assign({
      username: (ctx, event) => event.username,
    }),
    updateGame: assign({
      game: (ctx, event) => {
        return event.game;
      },
    }),
    subscribeToGameChannel: assign({
      gameID: (ctx, event) => ctx.pusher.subscribe(`${ctx.gameID}-host-events`),
    }),
    changeTeam: assign({
      teams: (ctx, event) => ({ ...ctx.teams, [event.userID]: event.team }),
    }),
    joinGame: assign({
      players: (ctx, event) => ({
        ...ctx.players,
        [event.userID]: { username: event.username },
      }),
    }),
  },
});

export default PlayerMachine;
