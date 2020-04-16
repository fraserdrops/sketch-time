import { useContext } from 'react';
import { PlayerServiceContext } from '../pages/index';
import PreTurn from './PreTurn';
import Turn from './Turn';

const Game = (props) => {
  const [playerState, playerSend] = useContext(PlayerServiceContext);
  const { id: userID, username, game, gameID, play } = playerState.context;
  const { players, teams } = game;
  const { word } = play;

  console.log(playerState.value.playing.turn);
  return (
    <>
      {playerState.value.playing.turn === 'preTurn' && <PreTurn />}
      {playerState.value.playing.turn === 'inTurn' && <Turn />}
    </>
  );
};

export default Game;
