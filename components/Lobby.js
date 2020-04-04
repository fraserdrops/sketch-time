import { useRouter } from 'next/router';
import Link from 'next/link';
import { useContext, useEffect, useState } from 'react';
import { GameContext } from '../pages/_app';
import JoinTeam from './JoinTeam';

const App = props => {
  const { pusher } = props;
  const router = useRouter();
  const host = router.query.host;
  const gameID = router.query.gameID;

  const { gameState, setGameState, userID } = useContext(GameContext);
  const [hostState, setHostState] = useState(gameState);
  const username = gameState.username;
  // host events
  useEffect(() => {
    if (host) {
      const channel = pusher.subscribe(`${gameID}-host-events`);
      channel.bind('changeTeam', async ({ team, userID }) => {
        setHostState(hostState => ({ ...hostState, teams: { ...hostState.teams, [userID]: team } }));
      });

      channel.bind('joinGame', async ({ userID, username }) => {
        setHostState(hostState => ({ ...hostState, players: { ...hostState.players, [userID]: username } }));
      });
    }
  }, [host, gameID, pusher]);

  // host update game state
  // broadcast to other players
  useEffect(() => {
    const handleGameStateChange = async () => {
      if (host) {
        const payload = {
          gameID,
          gameState: hostState,
          eventType: 'updateGameState'
        };
        const res = await fetch('/api/game', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          console.error('event not sent');
        }
      }
    };

    handleGameStateChange();
  }, [host, hostState, gameID]);

  // game events
  useEffect(() => {
    const channel = pusher.subscribe(`${gameID}-game-events`);
    channel.bind('updateGameState', ({ gameState }) => {
      setGameState(gameState);
    });
  }, [setGameState, gameID, pusher]);

  const handleChangeTeam = async team => {
    const payload = {
      userID,
      gameID,
      team,
      eventType: 'changeTeam'
    };
    const res = await fetch('/api/host', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      console.error('event not sent');
    }
  };

  useEffect(() => {
    const joinGame = async () => {
      const payload = {
        userID,
        username,
        gameID,
        eventType: 'joinGame'
      };
      const res = await fetch('/api/host', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        console.error('event not sent');
      }
    };

    // hack to make sure the subscription is set up
    setTimeout(() => joinGame(), [1000]);
  }, []);

  // host only
  const handleStartGame = () => {
    setHostState(hostState => ({ ...hostState, gameStatus: 'game' }));
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

  const { teams, players } = gameState;
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
            .filter(userID => teams[userID] === 'Team 1')
            .map(userID => players[userID])}
        />
        <JoinTeam
          team='Team 2'
          joinText='Join Team 2'
          handleChangeTeam={() => handleChangeTeam('Team 2')}
          members={Object.keys(teams)
            .filter(userID => teams[userID] === 'Team 2')
            .map(userID => players[userID])}
        />
        <JoinTeam
          team='Unassigned'
          members={Object.keys(gameState.players)
            .filter(userID => !teams[userID])
            .map(userID => players[userID])}
        />
        {host && <button onClick={() => handleStartGame()}>Create Game</button>}
        <Link href={`/`}>
          <a>Home</a>
        </Link>
      </section>
    </div>
  );
};

export default App;
