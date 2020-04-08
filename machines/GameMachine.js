import { Machine, assign } from 'xstate';

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const GameMachine = Machine(
  {
    id: 'game',
    initial: 'ready',
    context: {
      gameID: undefined,
      players: [],
      teams: {},
    },
    states: {
      ready: {
        on: {
          CREATE_GAME: {
            target: 'lobby',
            actions: ['generateGameID', 'subscribeToGameChannel'],
          },
        },
      },
      lobby: {
        on: {
          START_GAME: { target: 'playing', actions: ['broadcastGameStart'] },
          CHANGE_TEAM: {
            actions: ['changeTeam', 'joinGame'],
          },
          PLAYER_JOIN: {
            actions: ['joinGame'],
          },
        },
      },
      playing: {},
    },
  },
  {
    actions: {
      // action implementations
      generateGameID: assign({
        gameID: (ctx, event) => getRandomInt(1000, 9999),
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

export default GameMachine;
