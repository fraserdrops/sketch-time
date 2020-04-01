import Pusher from 'pusher-js';
import { useEffect, useState, useContext } from 'react';
import { useRouter } from 'next/router';
import { GameContext } from './_app';
import Link from 'next/link';
import Lobby from '../components/Lobby';
import Game from '../components/Game';

const App = props => {
  const { pusher } = props;
  const router = useRouter();

  const { gameState, setGameState, userID } = useContext(GameContext);
  const [hostState, setHostState] = useState(gameState);
  return (
    <>
      {gameState.gameStatus === 'lobby' && <Lobby pusher={pusher} />}
      {gameState.gameStatus === 'game' && <Game pusher={pusher} />}
    </>
  );
};

export default App;
