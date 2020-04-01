import Link from 'next/link';
import { useState } from 'react';

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
  };

  return (
    <div className='App'>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h1>Pictionary - Covid19 Edition</h1>

        <button onClick={() => createGame()}>
          <Link href={`/lobby?host=true&gameID=${hostGameID}`}>
            <a>Create Game</a>
          </Link>
        </button>
        <h4>Join Game</h4>
        <input value={gameID} onChange={e => setGameID(e.target.value)} />
        <Link href={`/lobby?gameID=${gameID}`}>
          <a>Join Game</a>
        </Link>
      </div>
    </div>
  );
};

export default App;
