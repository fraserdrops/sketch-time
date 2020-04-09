import { Machine, assign } from 'xstate';
import { v4 as uuid } from 'uuid';

const PlayerMachine = Machine(
  {
    id: 'player',
    initial: 'ready',
    context: {
      id: uuid(),
      username: undefined,
      team: undefined,
    },
    on: {
      UPDATE_USERNAME: {
        actions: ['updateUsername'],
      },
    },
    states: {
      ready: {
        on: {
          JOIN_GAME: {
            target: 'lobby',
            actions: ['joinGame'],
          },
        },
      },
      lobby: {
        on: {
          START_GAME: { target: 'playing', actions: [] },
          CHANGE_TEAM: {
            actions: ['changeTeam'],
          },
        },
      },
      playing: {},
    },
  },
  {
    actions: {
      updateUsername: assign({
        username: (ctx, event) => event.username,
      }),
      subscribeToGameChannel: assign({
        gameID: (ctx, event) => ctx.pusher.subscribe(`${ctx.gameID}-host-events`),
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

export default PlayerMachine;
