import { useContext } from 'react';
import { PlayerServiceContext } from '../pages/index';

const BeforeTurn = (props) => {
  const { host } = props;
  const [playerState, playerSend] = useContext(PlayerServiceContext);
  const { id: userID, username, game, gameID, play, points } = playerState.context;

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
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
        }}
      >
        <h1 style={{ margin: 0, marginTop: 10, fontWeight: 500 }}>Sketch Time</h1>
        <div
          style={{
            height: 200,
            width: 230,
            backgroundSize: 'cover',
            backgroundImage: `url('https://rukminim1.flixcart.com/image/832/832/jl2m7ww0/board-game/x/v/f/original-pictionary-board-game-family-multi-player-game-ssd-original-imaf8abn5qcj2czu.jpeg?q=70')`,
          }}
        />
        {!host && <p>Waiting for host to start the next turn</p>}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '50% 50%',
            gridTemplateRows: '30px 1fr 1fr',
            height: 90,
            width: 200,
            textAlign: 'center',
          }}
        >
          <p style={{ gridColumn: '1 / 3', gridRow: '1 / 2 ', margin: 0, fontSize: 20 }}>Points</p>
          <p style={{ gridColumn: '1 / 2', gridRow: '2 / 3 ', margin: 0 }}>Team 1</p>
          <p style={{ gridColumn: '1 / 2', gridRow: '3 / 4 ', margin: 0, fontWeight: 600 }}>{points.team1}</p>
          <p style={{ gridColumn: '2 / 3', gridRow: '2 / 3 ', margin: 0 }}>Team 2</p>
          <p style={{ gridColumn: '2 / 3', gridRow: '3 / 4 ', margin: 0, fontWeight: 600 }}>{points.team2}</p>
        </div>

        {host && <button onClick={() => playerSend({ type: 'START_TURN' })}>Start Turn</button>}
      </div>

      <div></div>
    </div>
  );
};

export default BeforeTurn;
