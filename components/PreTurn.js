import { useContext } from 'react';
import { PlayerServiceContext } from '../pages/index';

const PreTurn = (props) => {
  const [playerState, playerSend] = useContext(PlayerServiceContext);
  const { id: userID, username, game, gameID, play } = playerState.context;
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
        <p>Get ready</p>
        {drawing && <p>Your word is {word}</p>}
        {guessing && <p>You'll be guessing the word</p>}
        {spectating && <p>You're spectating this round</p>}
      </div>

      <div></div>
    </div>
  );
};

export default PreTurn;
