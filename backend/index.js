const express = require('express');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 8000;
const { gameMachine } = require('./machines/GameMachine');
const { gameManagerMachine } = require('./machines/GameManagerMachine');
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
const service = interpret(gameManagerMachine)
  .onTransition((state) => {
    console.log('service', state.value);
  })
  .start();

// Send events

app.get('/', (req, res) => res.send('Hello World!'));

app.post('/game', (req, res) => {
  service.send({ ...req.body, res });
});

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`));
