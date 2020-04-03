import { useEffect, useState, useContext, useRef } from 'react';
import { useRouter } from 'next/router';
import { GameContext } from '../pages/_app';
import Draw from '../components/Draw';
import wordList from '../data/medium1';

const Game = props => {
  const { pusher } = props;
  const router = useRouter();
  const host = router.query.host;
  const gameID = router.query.gameID;

  const { gameState, setGameState, userID } = useContext(GameContext);
  const [hostState, setHostState] = useState(gameState);
  const hostStateRef = useRef(hostState);
  useEffect(() => {
    hostStateRef.current = hostState;
  }, [hostState]);
  // start game
  useEffect(() => {
    const players = Object.keys(gameState.teams);
    const team1 = players.filter(userID => gameState.teams[userID] === 'Team 1');
    const team2 = players.filter(userID => gameState.teams[userID] === 'Team 2');
    const playState = {
      // first player in team 1
      currentPlayer: team1[0],
      currentTeam: 'Team 1',
      playOrder: {
        team1,
        team2,
        previousTeam1Player: undefined,
        previousTeam2Player: undefined
      },
      word: 'pizza'
    };
    setHostState(hostState => ({ ...hostState, playState }));
  }, []);
  // host events
  // this is where the new game state is created
  useEffect(() => {
    if (host) {
      const channel = pusher.subscribe(`${gameID}-host-events`);
      channel.bind(
        'endTurn',
        async function() {
          const { currentPlayer, currentTeam, playOrder } = this.current.playState;
          const newPlayState = {};
          const newPlayOrder = { ...playOrder };

          // this allows for coop if all players join team 1
          const playersInTeam2 = Object.values(this.current.teams).includes('Team 2');
          if (currentTeam === 'Team 1' && playersInTeam2) {
            newPlayState.currentTeam = 'Team 2';
            let nextTeam2Player;
            const lastTeam2Player = playOrder.previousTeam2Player;
            newPlayOrder.previousTeam1Player = currentPlayer;
            if (lastTeam2Player) {
              const lastTeam2PlayerIndex = playOrder.team2.indexOf(lastTeam2Player);

              const nextTeam2PlayerIndex =
                lastTeam2PlayerIndex + 1 < playOrder.team2.length ? lastTeam2PlayerIndex + 1 : 0;
              nextTeam2Player = playOrder.team2[nextTeam2PlayerIndex];
            } else {
              nextTeam2Player = playOrder.team2[0];
            }
            newPlayState.currentPlayer = nextTeam2Player;
          } else {
            newPlayState.currentTeam = 'Team 1';
            let nextTeam1Player;
            newPlayOrder.previousTeam2Player = currentPlayer;
            const lastTeam1Player = playOrder.previousTeam1Player;
            if (lastTeam1Player) {
              const lastTeam1PlayerIndex = playOrder.team1.indexOf(lastTeam1Player);

              const nextTeam1PlayerIndex =
                lastTeam1PlayerIndex + 1 < playOrder.team1.length ? lastTeam1PlayerIndex + 1 : 0;
              nextTeam1Player = playOrder.team1[nextTeam1PlayerIndex];
            } else {
              nextTeam1Player = playOrder.team1[0];
            }
            newPlayState.currentPlayer = nextTeam1Player;
          }

          newPlayState.playOrder = newPlayOrder;
          newPlayState.word = wordList[Math.floor(Math.random() * wordList.length)];

          setHostState(hostState => ({ ...hostState, playState: newPlayState }));
        },
        hostStateRef
      );
    }
  }, [host, gameID, pusher]);

  // host update game state
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

  const handleEndTurn = async () => {
    const payload = {
      gameID,
      eventType: 'endTurn'
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

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      {/* <div style={{ position: 'absolute', top: 0, left: 400 }}>
        {userID === gameState.playState.currentPlayer && <p>You're Up! Draw {gameState.playState.word}</p>}
        {userID !== gameState.playState.currentPlayer &&
          gameState.teams[userID] === gameState.playState.currentTeam && <p>You're Up! Guess what the word is</p>}
        {gameState.teams[userID] !== gameState.playState.currentTeam && (
          <p>
            {gameState.players[userID]} is Drawing {gameState.playState.word}
          </p>
        )}
        <button onClick={handleEndTurn}>End Turn</button>
      </div> */}
      <Draw allowDrawing={userID === gameState.playState.currentPlayer} pusher={pusher} />
    </div>
  );
};

export default Game;
