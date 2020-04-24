import { useContext } from 'react';
import { PlayerServiceContext } from '../pages/index';

const PreTurn = (props) => {
  const [playerState, playerSend] = useContext(PlayerServiceContext);
  const { id: userID, username, game, gameID, play } = playerState.context;
  const { word } = play;

  const { preTurn } = playerState.context;
  console.log(preTurn.countdown);
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
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
        }}
      >
        <p>Get ready</p>
        <p style={{ fontSize: 30, fontWeight: 600 }}>{preTurn.countdown}</p>
        {drawing && (
          <>
            <p style={{ fontSize: 20 }}>You're drawing</p>
            <p style={{ margin: 0, fontSize: 30, fontWeight: 500 }}>{word}</p>
          </>
        )}
        {guessing && (
          <p>
            You'll be <span style={{ fontSize: 20, fontWeight: 500 }}>guessing</span> the word
          </p>
        )}
        {spectating && (
          <p>
            You're <span style={{ fontSize: 20, fontWeight: 500 }}>spectating</span> this round
          </p>
        )}
      </div>

      <div></div>
    </div>
  );
};

export default PreTurn;
