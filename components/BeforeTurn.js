import { useContext } from 'react';
import { PlayerServiceContext, GameServiceContext } from '../pages/index';

const BeforeTurn = (props) => {
  const [playerState, playerSend] = useContext(PlayerServiceContext);
  const { id: userID, username, game, gameID, play } = playerState.context;
  const [gameState, gameSend] = useContext(GameServiceContext);
  const host = !gameState.matches('ready');

  const { word } = play;

  const drawing = playerState.value.playing.task === 'drawing';
  const guessing = playerState.value.playing.task === 'guessing';
  const spectating = playerState.value.playing.task === 'spectating';

  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          height: 30,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
        }}
      >
        <p>Game</p>
        <p>Imagine a board here</p>
        {!host && <p>Waiting for host to start the next turn</p>}
        {host && <button onClick={() => gameSend('START_TURN')}>Start Turn</button>}
      </div>

      <div></div>
    </div>
  );
};

export default BeforeTurn;
