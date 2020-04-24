import { useContext } from 'react';
import { PlayerServiceContext, GameServiceContext } from '../pages/index';

const BeforeTurn = (props) => {
  const [playerState, playerSend] = useContext(PlayerServiceContext);
  const [gameState, gameSend] = useContext(GameServiceContext);
  const host = !gameState.matches('ready');

  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
        }}
      >
        {!host && <p>Waiting for host to adjudicate</p>}
        {host && (
          <div>
            <button onClick={() => gameSend({ type: 'SUCCESSFUL' })}>Got it!</button>
            <button
              style={{ background: '#ff2213', marginLeft: 15 }}
              onClick={() => gameSend({ type: 'UNSUCCESSFUL' })}
            >
              Didn't get it!
            </button>
          </div>
        )}
      </div>

      <div></div>
    </div>
  );
};

export default BeforeTurn;
