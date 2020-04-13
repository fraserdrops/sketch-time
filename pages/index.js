import { useMachine } from '@xstate/react';
import Game from '../components/Game';
import Home from '../components/Home';
import Lobby from '../components/Lobby';
import GameMachine from '../machines/GameMachine';
import PlayerMachine from '../machines/PlayerMachine';
import { useEffect, createContext, useState } from 'react';
import ClientMachine from '../machines/ClientMachine';
import HostMachine from '../machines/HostMachine';

export const GameServiceContext = createContext();
export const PlayerServiceContext = createContext();
export const ClientServiceContext = createContext();

const App = (props) => {
  const [playerState, send, playerService] = useMachine(PlayerMachine);
  const [gameState, gameSend] = useMachine(GameMachine);
  const [myGameState, setGameState] = useState({ players: [], teams: {} });
  const isHost = !gameState.matches('ready');
  const [clientState, clientSend, clientService] = useMachine(ClientMachine);
  const [hostState, hostSend] = useMachine(HostMachine);

  return (
    <GameServiceContext.Provider value={[gameState, gameSend, clientSend]}>
      <PlayerServiceContext.Provider value={playerService}>
        <ClientServiceContext.Provider value={clientService}>
          {playerState.matches('ready') && <Home playerService={playerService} ctx={playerState.context} />}
          {playerState.matches('lobby') && <Lobby myGameState={myGameState} isHost={isHost} />}
          {playerState.matches('playing') && <Game />}
        </ClientServiceContext.Provider>
      </PlayerServiceContext.Provider>
    </GameServiceContext.Provider>
  );
};

export default App;
