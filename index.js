const express = require('express');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 8000;
const { gameMachine } = require('./machines/GameMachine');
const { gameManagerMachine } = require('./machines/GameManagerMachine');
const { Machine, interpret } = require('xstate');
var cors = require('cors');
var bodyParser = require('body-parser');

var http = require('http').createServer(app);
var io = require('socket.io')(http);

io.on('EVENT', (event) => {
  console.log('a user event', event);
});

const service = interpret(gameManagerMachine)
  .onTransition((state) => {
    console.log('service', state.value);
  })
  .start();

io.on('connection', (socket) => {
  socket.on('event', (event) => {
    console.log('a user event', event);
    service.send(event);
  });
  console.log('connected');
});

// Send events

// app.get('/', (req, res) => res.send('Hello World!'));

// app.post('/game', (req, res) => {
//   service.send({ ...req.body, res });
// });

// app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`));

http.listen(port, () => console.log(`Example app listening at http://localhost:${port}`));
