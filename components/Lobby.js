import { useService } from '@xstate/react';
import { useRouter } from 'next/router';
import { useContext } from 'react';
import { GameServiceContext, PlayerServiceContext } from '../pages/index';
import JoinTeam from './JoinTeam';

const App = (props) => {
  const { myGameState, isHost } = props;
  const host = isHost;
  const [playerState, playerSend] = useContext(PlayerServiceContext);
  let [gameState, gameSend, gameSendGlobal] = useContext(GameServiceContext);
  if (!host) {
    gameState.context = myGameState;
  }
  const { id, username, game } = playerState.context;
  const { players, teams, gameID } = game;

  const handleChangeTeam = async (team) => {
    playerSend({ type: 'CHANGE_TEAM', team, userID: id });
  };

  // host only
  const handleStartGame = () => {
    // const players = Object.keys(gameState.teams);
    // let currentPlayer = undefined;
    // players.forEach(player => {
    //   if (gameState.teams[player] === 'Team 1') {
    //     currentPlayer = player;
    //   }
    // });
    // const playState = {
    //   // first player in team 1
    //   currentPlayer,
    //   currentTeam: 'Team 1',
    //   previous: {
    //     team1: undefined,
    //     team2: undefined
    //   }
    // };
    // setHostState(hostState => ({ ...hostState, playState }));
    gameSendGlobal({ type: 'START_GAME' });
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
        {host && <button onClick={() => handleStartGame()}>Create Game</button>}
      </section>
    </div>
  );
};

export default App;
