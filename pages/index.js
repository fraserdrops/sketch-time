import { useMachine } from '@xstate/react';
import Game from '../components/Game';
import Home from '../components/Home';
import Lobby from '../components/Lobby';
import GameMachine from '../machines/GameMachine';
import PlayerMachine from '../machines/PlayerMachine';
import { useEffect, createContext, useState } from 'react';

export const GameServiceContext = createContext();
export const PlayerServiceContext = createContext();

const App = (props) => {
  const { pusher } = props;
  const [playerState, send, playerService] = useMachine(PlayerMachine);
  const [gameState, gameSend] = useMachine(GameMachine);
  const [myGameState, setGameState] = useState({ players: [], teams: {} });
  const isHost = !gameState.matches('ready');

  const sendEventToHost = (payload) => {
    const query = async () => {
      const res = await fetch('/api/host', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        console.error('event not sent');
      }
    };

    query();
  };

  // host handler
  useEffect(() => {
    if (isHost && gameState.context.gameID) {
      const channel = pusher.subscribe(`${gameState.context.gameID}-host-events`);
      channel.bind('events', async (event) => {
        if (Array.isArray(event)) {
          event.forEach((event) => {
            gameSend(event);
          });
        } else {
          gameSend(event);
        }
      });
    }
  }, [gameSend, pusher, isHost, gameState.context.gameID]);

  useEffect(() => {
    const channel = pusher.subscribe(`${'yes'}-game-events`);
    channel.bind('events', async (event) => {
      console.log('gameEvent');
      setGameState(event);
    });
  }, [gameSend, pusher]);

  return (
    <GameServiceContext.Provider value={[gameState, gameSend, sendEventToHost]}>
      <PlayerServiceContext.Provider value={playerService}>
        {playerState.matches('ready') && (
          <Home playerService={playerService} sendEventToHost={sendEventToHost} ctx={playerState.context} />
        )}
        {playerState.matches('lobby') && <Lobby pusher={pusher} myGameState={myGameState} isHost={isHost} />}
        {playerState.matches('playing') && <Game pusher={pusher} />}
      </PlayerServiceContext.Provider>
    </GameServiceContext.Provider>
  );
};

export default App;
