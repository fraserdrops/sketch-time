import { useMachine } from '@xstate/react';
import Game from '../components/Game';
import Home from '../components/Home';
import Lobby from '../components/Lobby';
import GameMachine from '../machines/GameMachine';
import PlayerMachine from '../machines/PlayerMachine';
import { useEffect, createContext } from 'react';

export const GameServiceContext = createContext();
export const PlayerServiceContext = createContext();

const App = (props) => {
  const { pusher } = props;
  const [playerState, send, playerService] = useMachine(PlayerMachine);
  const [gameState, gameSend] = useMachine(GameMachine);
  const isHost = playerState.matches('ready');

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
    const channel = pusher.subscribe(`${'yes'}-host-events`);
    channel.bind('events', async (event) => {
      console.log(event);
      if (Array.isArray(event)) {
        event.forEach((event) => gameSend(event));
      }
      gameSend(event);
    });
  }, [gameSend, pusher]);

  console.log('gameState', gameState);
  // console.log('playerState', playerState);

  return (
    <GameServiceContext.Provider value={[gameState, sendEventToHost]}>
      <PlayerServiceContext.Provider value={playerService}>
        {playerState.matches('ready') && (
          <Home playerService={playerService} sendEventToHost={sendEventToHost} ctx={playerState.context} />
        )}
        {playerState.matches('lobby') && <Lobby isHost={isHost} pusher={pusher} />}
        {playerState.matches('playing') && <Game pusher={pusher} />}
      </PlayerServiceContext.Provider>
    </GameServiceContext.Provider>
  );
};

export default App;
