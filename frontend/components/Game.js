import { useContext } from 'react';
import { PlayerServiceContext } from '../pages/index';
import PreTurn from './PreTurn';
import Turn from './Turn';
import BeforeTurn from './BeforeTurn';
import EndOfTurn from './EndOfTurn';

const Game = (props) => {
  const { host } = props;
  const [playerState, playerSend] = useContext(PlayerServiceContext);
  const { id: userID, username, game, gameID, play } = playerState.context;
  const { players, teams } = game;
  const { word } = play;

  return (
    <>
      {playerState.value.playing.turn === 'beforeTurn' && <BeforeTurn />}
      {playerState.value.playing.turn === 'preTurn' && <PreTurn />}
      {playerState.value.playing.turn === 'inTurn' && <Turn host={host} />}
      {playerState.value.playing.turn === 'endOfTurn' && <EndOfTurn />}
    </>
  );
};

export default Game;