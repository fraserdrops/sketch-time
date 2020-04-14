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
  const [gameState, gameSend] = useMachine(GameMachine);
  const isHost = !gameState.matches('ready');
  console.log(playerState);

  return (
    <GameServiceContext.Provider value={[gameState, gameSend]}>
      <PlayerServiceContext.Provider value={[playerState, send]}>
        {playerState.matches('ready') && <Home />}
        {playerState.matches('lobby') && <Lobby isHost={isHost} />}
        {playerState.matches('playing') && <Game />}
      </PlayerServiceContext.Provider>
    </GameServiceContext.Provider>
  );
};

export default App;
