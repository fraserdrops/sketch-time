import Pusher from 'pusher-js';
import { useEffect, useState, useContext } from 'react';
import { useRouter } from 'next/router';
import { GameContext } from './_app';
import Link from 'next/link';

const App = props => {
  const router = useRouter();
  const host = router.query.host;
  const gameID = router.query.gameID;

  const { gameState, setGameState, userID } = useContext(GameContext);
  const [hostState, setHostState] = useState(gameState);

  // host events
  useEffect(() => {
    if (host) {
      let pusher = new Pusher('3a40fa337322e97d8d0c', {
        cluster: 'ap4',
        forceTLS: true
      });
      const channel = pusher.subscribe(`${gameID}-host-events`);
      channel.bind('changeTeam', async ({ team, userID }) => {
        setHostState(hostState => ({ ...hostState, teams: { ...hostState.teams, [userID]: team } }));
      });
    }
  }, [host, gameID]);

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
    let pusher = new Pusher('3a40fa337322e97d8d0c', {
      cluster: 'ap4',
      forceTLS: true
    });
    const channel = pusher.subscribe(`${gameID}-game-events`);
    channel.bind('updateGameState', ({ gameState }) => {
      setGameState(gameState);
    });
  }, [setGameState, gameID]);

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

  // host only
  const handleStartGame = () => {
    const players = Object.keys(gameState.teams);
    let currentPlayer = undefined;
    players.forEach(player => {
      if (gameState.teams[player] === 'Team 1') {
        currentPlayer = player;
      }
    });
    const playState = {
      // first player in team 1
      currentPlayer,
      currentTeam: 'Team 1',
      previous: {
        team1: undefined,
        team2: undefined
      }
    };
    setHostState(hostState => ({ ...hostState, playState }));
  };

  const { teams } = gameState;
  return (
    <div className='App'>
      <header className='App-header'>
        <h1 className='App-title'>Game Lobby {gameID}</h1>
        <h2>{host ? 'Host' : 'Not Host'}</h2>
      </header>
      <section>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h4>Team 1</h4>
          {Object.keys(teams)
            .filter(userID => teams[userID] === 'Team 1')
            .map(userID => (
              <p>{userID}</p>
            ))}
          <button onClick={() => handleChangeTeam('Team 1')}>Join Team 1</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h4>Team 2</h4>
          {Object.keys(teams)
            .filter(userID => teams[userID] === 'Team 2')
            .map(userID => (
              <p>{userID}</p>
            ))}
          <button onClick={() => handleChangeTeam('Team 2')}>Join Team 2</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h4>Unsassigned</h4>
          {Object.keys(teams)
            .filter(userID => !teams[userID])
            .map(userID => (
              <p>{userID}</p>
            ))}
        </div>
        {host && (
          <button onClick={() => handleStartGame()}>
            <Link href={`/game?host=true&gameID=${gameID}`}>
              <a>Create Game</a>
            </Link>
          </button>
        )}
        <button>
          <Link href={`/game?gameID=${gameID}`}>
            <a>Start Game</a>
          </Link>
        </button>
      </section>
    </div>
  );
};

export default App;
