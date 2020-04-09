import { Machine, assign } from 'xstate';
import Pusher from 'pusher-js';

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
      players: [],
      teams: {},
      pusher,
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
        on: {
          START_GAME: { target: 'playing', actions: ['broadcastGameStart'] },
          CHANGE_TEAM: {
            actions: ['changeTeam', 'broadcast'],
          },
          PLAYER_JOIN: {
            actions: ['joinGame', 'broadcast'],
          },
        },
      },
      playing: {},
    },
  },
  {
    actions: {
      // action implementations
      broadcast: async (ctx, event) => {
        // console.log('broadcast', ctx);
        const { gameID, players, teams } = ctx;
        const payload = {
          gameID,
          players,
          teams,
        };
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
      },
      generateGameID: assign({
        gameID: (ctx, event) => event.gameID,
      }),
      subscribeToGameChannel: assign({
        channel: (ctx, event) => ctx.pusher.subscribe(`${ctx.gameID}-host-events`),
      }),
      changeTeam: assign({
        teams: (ctx, event) => ({ ...ctx.teams, [event.userID]: event.team }),
      }),
      joinGame: assign({
        players: (ctx, event) => ({ ...ctx.players, [event.userID]: { username: event.username } }),
      }),
    },
  }
);

export default GameMachine;
