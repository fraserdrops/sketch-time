import { Machine, assign, spawn } from 'xstate';
import Pusher from 'pusher-js';
import PlayerMachine from './PlayerMachine';

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

let pusher = new Pusher('3a40fa337322e97d8d0c', {
  cluster: 'ap4',
  forceTLS: true,
});

const GameMachine = Machine(
  {
    id: 'game',
    initial: 'ready',
    context: {
      gameID: undefined,
      game: {
        players: [],
        teams: {},
      },
      pusher,
      playerRefs: [],
    },
    states: {
      ready: {
        on: {
          CREATE_GAME: {
            target: 'lobby',
            actions: ['generateGameID'],
          },
        },
      },
      lobby: {
        invoke: {
          id: 'socket',
          src: (context, event) => (callback, onEvent) => {
            const channel = pusher.subscribe(`${context.gameID}-host-events`);
            channel.bind('events', async (event) => {
              if (Array.isArray(event)) {
                event.forEach((event) => {
                  callback(event);
                });
              } else {
                callback(event);
              }
            });
          },
        },
        on: {
          START_GAME: { target: 'playing', actions: ['broadcastGameStart'] },
          CHANGE_TEAM: {
            actions: ['changeTeam', 'broadcast'],
          },
          PLAYER_JOIN: {
            actions: ['joinGame', 'playerRef', 'broadcast'],
          },
        },
      },
      playing: {},
    },
  },
  {
    actions: {
      log: (ctx, event) => console.log(event),
      // action implementations
      broadcast: async (ctx, event) => {
        const payload = {
          gameID: ctx.gameID,
          game: ctx.game,
        };
        setTimeout(async () => {
          const res = await fetch('/api/game', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
            console.error('event not sent');
          }
        }, 1000);
      },

      generateGameID: assign({
        gameID: (ctx, event) => event.gameID,
      }),
      subscribeToGameChannel: assign({
        channel: (ctx, event) => ctx.pusher.subscribe(`${ctx.gameID}-host-events`),
      }),
      changeTeam: assign({
        game: (ctx, event) => ({
          ...ctx.game,
          teams: { ...ctx.teams, [event.userID]: event.team },
        }),
      }),
      joinGame: assign({
        game: (ctx, event) => ({
          ...ctx.game,
          players: { ...ctx.game.players, [event.userID]: { username: event.username } },
        }),
      }),
      playerRef: assign({
        playerRefs: (context, event) => [
          ...context.playerRefs,
          {
            player: event.player,
            // add a new todoMachine actor with a unique name
            ref: spawn(PlayerMachine.withContext(), `player-${event.id}`),
          },
        ],
      }),
    },
  }
);

export default GameMachine;
