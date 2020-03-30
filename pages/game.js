import Pusher from 'pusher-js';
import { useEffect, useState, useContext } from 'react';
import { v4 as uuid } from 'uuid';
import { useRouter } from 'next/router';
import { GameContext } from './_app';
import Draw from '../components/Draw';

const App = props => {
  const router = useRouter();
  const host = router.query.host;

  const { gameState, setGameState, userID } = useContext(GameContext);
  const [hostState, setHostState] = useState(gameState);

  // start game
  useEffect(() => {
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
  }, []);

  // host events
  // this is where the new game state is created
  useEffect(() => {
    if (host) {
      let pusher = new Pusher('3a40fa337322e97d8d0c', {
        cluster: 'ap4',
        forceTLS: true
      });
      const channel = pusher.subscribe('host-events');
      channel.bind('endTurn', async ({ team, userID }) => {
        setHostState(hostState => ({ ...hostState, teams: { ...hostState.teams, [userID]: team } }));
      });
    }
  }, [host]);

  // host update game state
  useEffect(() => {
    const handleGameStateChange = async () => {
      if (host) {
        const payload = {
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
  }, [host, hostState]);

  // game events
  useEffect(() => {
    let pusher = new Pusher('3a40fa337322e97d8d0c', {
      cluster: 'ap4',
      forceTLS: true
    });
    const channel = pusher.subscribe('game-events');
    channel.bind('updateGameState', ({ gameState }) => {
      console.log('updating', gameState);
      setGameState(gameState);
    });
  }, [setGameState]);

  const handleEndTurn = async team => {
    const payload = {
      userID,
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

  const { teams } = gameState;
  console.log(gameState);
  return (
    <div className='App'>
      <header className='App-header'>
        {gameState.teams[userID] === gameState.playState.currentTeam && (
          <Draw allowDrawing={userID === gameState.playState.currentPlayer} />
        )}
        <h2>{host ? 'Host' : 'Not Host'}</h2>

        <h2>
          {gameState.teams[userID] === gameState.playState.currentTeam
            ? 'your team is playing'
            : 'your team is not playing'}
        </h2>
      </header>
    </div>
  );
};

export default App;
