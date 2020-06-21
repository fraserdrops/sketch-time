const express = require('express');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 8000;
const { gameManagerMachine } = require('./machines/GameManagerMachine');
const { interpret } = require('xstate');

var http = require('http').createServer(app);
var io = require('socket.io')(http);

const service = interpret(gameManagerMachine.withContext({ ...gameManagerMachine.context, io }))
  .onTransition((state) => {
    console.log('service', state.value);
  })
  .start();

http.listen(port, () => console.log(`Example app listening at http://localhost:${port}`));
