import { useContext } from "react";
import { PlayerServiceContext } from "../pages/index";
import PreTurn from "./PreTurn";
import Turn from "./Turn";
import BeforeTurn from "./BeforeTurn";
import EndOfTurn from "./EndOfTurn";

const Game = (props) => {
  const { host } = props;
  const [playerState, playerSend] = useContext(PlayerServiceContext);
  const { username, game, gameID, play } = playerState.context;
  const { players, teams } = game;
  const { word } = play;

  return (
    <>
      {playerState.value.playing.turn === "beforeTurn" && (
        <BeforeTurn host={host} />
      )}
      {playerState.value.playing.turn === "preTurn" && <PreTurn host={host} />}
      {playerState.value.playing.turn === "inTurn" && <Turn host={host} />}
      {playerState.value.playing.turn === "endOfTurn" && (
        <EndOfTurn host={host} />
      )}
    </>
  );
};

export default Game;
