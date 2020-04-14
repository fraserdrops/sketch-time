// import { Machine, assign, spawn, send } from 'xstate';
// import Pusher from 'pusher-js';

// let pusher = new Pusher('3a40fa337322e97d8d0c', {
//   cluster: 'ap4',
//   forceTLS: true,
// });

// const ClientMachine = Machine(
//   {
//     id: 'client',
//     initial: 'idle',
//     context: {
//       gameID: undefined,
//       playerID: [],
//       player: {},
//       game: {},
//       pusher,
//     },
//     on: {
//       '*': {
//         actions: () => console.log('yoza'),
//       },
//     },
//     states: {
//       idle: {
//         on: {
//           CONNECT_TO_GAME: {
//             target: 'connected',
//             actions: ['log', 'addGameID'],
//           },
//         },
//       },
//       connected: {
//         invoke: {
//           id: 'socket',
//           src: (context, event) => (callback, onEvent) => {
//             const channel = pusher.subscribe(`${context.gameID}-host-events`);
//             channel.bind('events', async (event) => {
//               if (Array.isArray(event)) {
//                 event.forEach((event) => {
//                   callback(event);
//                 });
//               } else {
//                 callback(event);
//               }
//             });

//             onEvent(async (event) => {
//               console.log(event);
//               const res = await fetch('/api/host', {
//                 method: 'POST',
//                 headers: {
//                   'Content-Type': 'application/json',
//                 },
//                 body: JSON.stringify(event),
//               });
//               if (!res.ok) {
//                 console.error('event not sent');
//               }
//             });
//           },
//         },
//         on: {
//           PLAYER_JOIN: {
//             actions: send(
//               (ctx, event) => ({
//                 ...event,
//               }),
//               { to: 'socket' }
//             ),
//           },
//         },
//       },
//     },
//   },
//   {
//     actions: {
//       log: (ctx, event) => console.log(event),
//       // action implementations
//       sendToHost: async (ctx, event) => {
//         console.log('SEND TO HOST', event);
//         const res = await fetch('/api/host', {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json',
//           },
//           body: JSON.stringify(event),
//         });
//         if (!res.ok) {
//           console.error('event not sent');
//         }
//       },
//       addGameId: assign({
//         gameID: (ctx, event) => event.gameId,
//       }),

//       connectPusher: assign((ctx, event) => {
//         const channel = pusher.subscribe(`${event.gameID}-game-events`);
//         channel.bind('events', async (event) => {
//           if (!event.targetPlayer || event.targetPlayer === ctx.playerID) console.log('gameEvent');
//           return { player: 'yes' };
//         });
//         return { channel, gameID: event.gameID };
//       }),
//     },
//   }
// );

// export default ClientMachine;
