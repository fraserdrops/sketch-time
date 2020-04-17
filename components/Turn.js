import { useContext } from 'react';
import Draw from '../components/Draw';
import { PlayerServiceContext } from '../pages/index';

const Turn = (props) => {
  const [playerState, playerSend] = useContext(PlayerServiceContext);
  const { id: userID, username, game, gameID, play } = playerState.context;
  const { word, playerDrawing } = play;
  const { turn } = playerState.context;
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
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
        }}
      >
        {drawing && (
          <p>
            You're Up! Draw <span style={{ fontWeight: 'bold' }}>{word}</span>
          </p>
        )}
        <p style={{ position: 'absolute', fontSize: 18, right: 10, top: 5 }}>{turn.countdown}</p>
        {guessing && <p>You're up! Guess what {playerDrawing} is drawing</p>}
        {spectating && (
          <p>
            You're spectating {playerDrawing} draw {word}
          </p>
        )}
      </div>
      {drawing && <Draw allowDrawing={drawing} />}
      {!drawing && <Draw allowDrawing={drawing} />}
      <p>Game</p>
      <div></div>
    </div>
  );
};

export default Turn;
