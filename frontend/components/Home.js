import { useContext, useState } from 'react';
import { PlayerServiceContext } from '../pages/index';

const Home = (props) => {
  const [playerState, playerSend] = useContext(PlayerServiceContext);
  const [gameID, setGameID] = useState('');

  const { username } = playerState.context;

  const createGame = () => {
    playerSend('CREATE_GAME');
  };

  const joinGame = () => {
    playerSend({ type: 'JOIN_GAME', gameID, username });
  };

  return (
    <div className='App'>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h1 style={{ margin: 0, marginTop: 10, fontWeight: 500 }}>Sketch Times</h1>
        <h2 style={{ margin: 0, marginTop: 5, fontWeight: 400 }}>Covid19 Edition</h2>
        <p style={{ marginBottom: 0 }}>Username</p>
        <input
          style={{ marginBottom: 20 }}
          value={username || ''}
          onChange={(e) => {
            playerSend({ type: 'UPDATE_USERNAME', username: e.target.value });
          }}
        />
        {username && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
              <h4 style={{ marginBottom: 0 }}>Join Game</h4>
              {playerState.value?.ready === 'errorJoiningGame' && (
                <p style={{ position: 'absolute', right: 0, top: -10, color: 'red' }}>Game ID doesn't exist</p>
              )}
              <p style={{ marginBottom: 0, marginTop: 0 }}>Enter Game Code</p>
              <input value={gameID} onChange={(e) => setGameID(e.target.value)} />
              <button onClick={() => joinGame()}>Join Game</button>
            </div>
            <div>
              <h4>Or</h4>
            </div>
            <div>
              <button onClick={() => createGame()}>Host Game</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Home;
