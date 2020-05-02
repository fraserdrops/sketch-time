import { useContext } from 'react';
import { GameServiceContext, PlayerServiceContext } from '../pages/index';
import JoinTeam from './JoinTeam';

const App = (props) => {
  const { myGameState, host } = props;
  const [playerState, playerSend] = useContext(PlayerServiceContext);
  const [gameState, gameSend] = useContext(GameServiceContext);
  if (!host) {
    gameState.context = myGameState;
  }
  const { id, username, game, gameID } = playerState.context;
  const { players, teams } = game;
  console.log(game);
  const handleChangeTeam = async (team) => {
    playerSend({ type: 'CHANGE_TEAM', team, userID: id });
  };

  // host only
  const handleStartGame = () => {
    gameSend({ type: 'START_GAME' });
  };

  return (
    <div className='App'>
      <header className='App-header'>
        <h2 className='App-title' style={{ textAlign: 'center', fontWeight: 400 }}>
          Game Lobby <span style={{ fontWeight: 700 }}>{gameID}</span>
        </h2>
      </header>
      <section style={{ display: 'flex', alignItems: 'center', flexDirection: 'column' }}>
        <JoinTeam
          team='Team 1'
          joinText='Join Team 1'
          handleChangeTeam={() => handleChangeTeam('Team 1')}
          members={Object.keys(teams)
            .filter((userID) => teams[userID] === 'Team 1')
            .map((userID) => players[userID])}
        />
        <JoinTeam
          team='Team 2'
          joinText='Join Team 2'
          handleChangeTeam={() => handleChangeTeam('Team 2')}
          members={Object.keys(teams)
            .filter((userID) => teams[userID] === 'Team 2')
            .map((userID) => players[userID])}
        />
        <JoinTeam
          team='Unassigned'
          members={Object.keys(players)
            .filter((userID) => !teams[userID])
            .map((userID) => players[userID])}
        />
        {host && (
          <button style={{ position: 'absolute', top: 5, right: 5 }} onClick={() => handleStartGame()}>
            Start Game
          </button>
        )}
      </section>
    </div>
  );
};

export default App;
