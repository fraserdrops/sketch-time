import { useRouter } from 'next/router';
import Link from 'next/link';
import { useContext, useEffect, useState } from 'react';
import JoinTeam from './JoinTeam';
import { send } from 'xstate';
import { useMachine, useService } from '@xstate/react';
import { GameServiceContext, PlayerServiceContext } from '../pages/index';

const App = (props) => {
  const { pusher } = props;
  const router = useRouter();
  const host = router.query.host;
  const gameID = router.query.gameID;
  const playerService = useContext(PlayerServiceContext);
  const [playerState, playerSend] = useService(playerService);
  const [gameState, gameSend] = useContext(GameServiceContext);
  const { id, username } = playerState.context;
  const { players, teams } = gameState.context;
  console.log(players, teams);

  // // host update game state
  // // broadcast to other players
  // useEffect(() => {
  //   const handleGameStateChange = async () => {
  //     if (host) {
  //       const payload = {
  //         gameID,
  //         gameState: hostState,
  //         eventType: 'updateGameState',
  //       };
  //       const res = await fetch('/api/game', {
  //         method: 'POST',
  //         headers: {
  //           'Content-Type': 'application/json',
  //         },
  //         body: JSON.stringify(payload),
  //       });
  //       if (!res.ok) {
  //         console.error('event not sent');
  //       }
  //     }
  //   };

  //   handleGameStateChange();
  // }, [host, hostState, gameID]);

  // game events
  // useEffect(() => {
  //   const channel = pusher.subscribe(`${gameID}-game-events`);
  //   channel.bind('updateGameState', ({ gameState }) => {
  //     setGameState(gameState);
  //   });
  // }, [setGameState, gameID, pusher]);

  const handleChangeTeam = async (team) => {
    const payload = {
      id,
      gameID,
      team,
      eventType: 'changeTeam',
    };
    const res = await fetch('/api/host', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error('event not sent');
    }
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
