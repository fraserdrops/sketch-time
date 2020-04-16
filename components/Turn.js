import { useContext } from 'react';
import Draw from '../components/Draw';
import { PlayerServiceContext } from '../pages/index';

const Turn = (props) => {
  const [playerState, playerSend] = useContext(PlayerServiceContext);
  const { id: userID, username, game, gameID, play } = playerState.context;
  const { word } = play;

  const drawing = playerState.value.playing.task === 'drawing';

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
        {playerState.matches({ playing: 'guessing' }) && <p>You're Up! Guess what the word is</p>}
        {/* {playerState.matches({ playing: 'spectating' }) && (
          <p>
            {gameState.players[gameState.playState.currentPlayer]} is Drawing {gameState.playState.word}
          </p>
        )} */}
        {/* {host && <button onClick={handleEndTurn}>End Turn</button>} */}
      </div>
      {drawing && <Draw allowDrawing={drawing} />}
      {!drawing && <Draw allowDrawing={drawing} />}
      <p>Game</p>
      <div></div>
    </div>
  );
};

export default Turn;
