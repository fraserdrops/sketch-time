import { useMachine } from '@xstate/react';
import Game from '../components/Game';
import Home from '../components/Home';
import Lobby from '../components/Lobby';
import GameMachine from '../machines/GameMachine';
import PlayerMachine from '../machines/PlayerMachine';
import { useEffect, createContext, useState } from 'react';

export const GameServiceContext = createContext();
export const PlayerServiceContext = createContext();
export const ClientServiceContext = createContext();

const App = (props) => {
  const [playerState, send, playerService] = useMachine(PlayerMachine);
  const { player, host } = playerState.context;
  const [gameState, gameSend1] = useMachine(GameMachine);

  const gameSend = async (event) => {
    console.log('sending to game');
    fetch('http://localhost:8000/game', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ gameID: playerState.context.gameID, ...event }),
    });
  };

  console.log(playerState.value);

  return (
    <GameServiceContext.Provider value={[gameState, gameSend]}>
      <PlayerServiceContext.Provider value={[playerState, send]}>
        {playerState.matches('ready') && <Home />}
        {playerState.matches('lobby') && <Lobby host={host} />}
        {playerState.matches('playing') && <Game host={host} />}
      </PlayerServiceContext.Provider>
    </GameServiceContext.Provider>
  );
};

export default App;
