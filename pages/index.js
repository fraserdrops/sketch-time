import Pusher from 'pusher-js';
import { useEffect, useState, useRef } from 'react';
import Colors from '../components/Colors';
import Link from 'next/link';

const App = props => {
  const [gameID, setGameID] = useState('');
  const [isHost, setIsHost] = useState(false);
  function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  const hostGameID = getRandomInt(1000, 9999);
  const createGame = () => {
    setIsHost(true);

    console.log(getRandomInt(1000, 9999));
  };

  return (
    <div className='App'>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h1>Pictionary - Covid19 Edition</h1>

        <button onClick={() => createGame()}>
          <Link href='/lobby?host=true'>
            <a>Create Game</a>
          </Link>
        </button>
        <h4>Join Game</h4>
        <input value={gameID} onChange={e => setGameID(e.target.value)} />
      </div>
    </div>
  );
};

export default App;
