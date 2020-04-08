import { useMachine } from '@xstate/react';
import Game from '../components/Game';
import Home from '../components/Home';
import Lobby from '../components/Lobby';
import GameMachine from '../machines/GameMachine';

const App = (props) => {
  const { pusher } = props;
  const [state, send] = useMachine(GameMachine);

  return (
    <>
      {state.matches('ready') && <Home send={send} />}
      {state.matches('lobby') && <Lobby pusher={pusher} />}
      {state.matches('playing') && <Game pusher={pusher} />}
    </>
  );
};

export default App;
