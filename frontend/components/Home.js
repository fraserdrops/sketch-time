import { useContext, useState } from 'react';
import { useMachine, useService } from '@xstate/react';
import { GameServiceContext, PlayerServiceContext, ClientServiceContext } from '../pages/index';

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const Home = (props) => {
  const [playerState, playerSend] = useContext(PlayerServiceContext);
  const [gameState, gameSend] = useContext(GameServiceContext);
  const [gameID, setGameID] = useState('');

  const hostGameID = getRandomInt(1000, 9999);

  const { id, username } = playerState.context;

  const createGame = () => {
    playerSend({
      type: 'CREATE_GAME',
      gameID: hostGameID,
      playerID: id,
      username,
      // callback ensures the playersend is executed once the game is created, otherwise the event can be missed
    });
  };

  const joinGame = () => {
    playerSend({ type: 'JOIN_GAME', gameID, playerID: id, username });
  };

  return (
    <div className='App'>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h1 style={{ margin: 0, marginTop: 10, fontWeight: 500 }}>Sketch Time</h1>
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
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h4 style={{ marginBottom: 0 }}>Join Game</h4>
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
