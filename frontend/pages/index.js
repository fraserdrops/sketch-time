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
  const [gameState, gameSend1] = useMachine(GameMachine);
  const [host, setHost] = useState(false);

  const gameSend = async (event) => {
    const res = await fetch('http://localhost:8000/game', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ gameID: playerState.context.gameID, ...event }),
    });
    console.log(res);
  };

  return (
    <GameServiceContext.Provider value={[gameState, gameSend]}>
      <PlayerServiceContext.Provider value={[playerState, send]}>
        {playerState.matches('ready') && <Home setHost={setHost} />}
        {playerState.matches('lobby') && <Lobby host={host} />}
        {playerState.matches('playing') && <Game host={host} />}
      </PlayerServiceContext.Provider>
    </GameServiceContext.Provider>
  );
};

export default App;
