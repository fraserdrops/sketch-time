const express = require('express');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 8000;
const { gameMachine } = require('./machines/GameMachine');
const { Machine, interpret } = require('xstate');
var cors = require('cors');
var bodyParser = require('body-parser');
app.use(cors());
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
const service = interpret(gameMachine)
  .onTransition((state) => {
    console.log('service', state.value);
  })
  .start();

// Send events

app.get('/', (req, res) => res.send('Hello World!'));

ctx = { gameID: '1675' };
// pusher.trigger(`${ctx.gameID}-host-events`, 'events', {
//   message: 'hello world',
// });

app.get('/create', (req, res) => {
  console.log('yoza');
  service.send({ type: 'CREATE_GAME', gameID: '9844', callback: () => console.log('yoza') });

  res.send('Hello World!');
});

app.post('/game', (req, res) => {
  console.log('game', req.body);
  service.send({ ...req.body, callback: () => console.log('yoza') });
  res.send('Game j!');
});

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`));
