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

const HostMachine = Machine(
  {
    id: 'host',
    initial: 'idle',
    context: {
      gameID: undefined,
      clients: [],
      pusher,
    },
    states: {
      idle: {
        on: {
          CREATE_GAME: {
            target: 'connected',
            actions: ['generateGameID', 'connectPusher'],
          },
        },
      },
      connected: {
        on: {
          PLAYER_JOIN: {
            actions: ['log', 'joinGame', 'playerRef', 'broadcast'],
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

export default HostMachine;
