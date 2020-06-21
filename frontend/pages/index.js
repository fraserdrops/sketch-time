import { useMachine } from '@xstate/react';

import Game from '../components/Game';
import Home from '../components/Home';
import Lobby from '../components/Lobby';
import PlayerMachine from '../machines/PlayerMachine';
import { useEffect, createContext, useState } from 'react';
import { useRouter } from 'next/router';

export const PlayerServiceContext = createContext();
export const ClientServiceContext = createContext();

const App = (props) => {
  const { resolvedState } = props;

  const router = useRouter();
  const [playerState, send, playerService] = useMachine(PlayerMachine, {
    state: resolvedState,
  });
  const { player, host, gameID, id } = playerState.context;
  console.log(playerState);
  useEffect(() => {
    // Always do navigations after the first render
    if (gameID) {
      router.push(`/?gameID=${gameID}&playerID=${id}`, undefined, { shallow: true });
    }
  }, [gameID]);
  // useEffect(() => {
  //   if (gameID) {
  //     window.localStorage.setItem(gameID + '^' + id, JSON.stringify(playerState));
  //   }
  // }, [playerState, gameID]);

  // useEffect(() => {
  //   console.log('YOSDUOSDF');
  //   if (resolvedState) {
  //     send('REJOIN_GAME');
  //     console.log(playerState.value);
  //   }
  // }, []);

  const gameSend = async (event) => {
    console.log('sending to game');
    fetch('http://localhost:8000/game', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ gameID: playerState.context.gameID, ...event }),
    });
  };

  return (
    <PlayerServiceContext.Provider value={[playerState, send]}>
      {playerState.matches('ready') && <Home />}
      {playerState.matches('lobby') && <Lobby host={host} />}
      {playerState.matches('playing') && <Game host={host} />}
    </PlayerServiceContext.Provider>
  );
};

export default App;
