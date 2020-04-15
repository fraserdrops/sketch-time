import { useEffect, useState, useContext, useRef } from 'react';
import { useRouter } from 'next/router';
import { GameContext } from '../pages/_app';
import Draw from '../components/Draw';
import wordList from '../data/medium1';
import { GameServiceContext, PlayerServiceContext } from '../pages/index';

const Game = (props) => {
  const { pusher } = props;
  const [playerState, playerSend] = useContext(PlayerServiceContext);
  const [gameState, gameSend] = useContext(GameServiceContext);
  const { id: userID, username, game, gameID, play } = playerState.context;
  const { players, teams } = game;
  const { word } = play;

  const drawing = playerState.matches({ playing: 'drawing' });

  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          height: 30,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
        }}
      >
        {drawing && (
          <p>
            You're Up! Draw <span style={{ fontWeight: 'bold' }}>{word}</span>
          </p>
        )}
        {playerState.matches({ playing: 'guessing' }) && <p>You're Up! Guess what the word is</p>}
        {/* {playerState.matches({ playing: 'spectating' }) && (
          <p>
            {gameState.players[gameState.playState.currentPlayer]} is Drawing {gameState.playState.word}
          </p>
        )} */}
        {/* {host && <button onClick={handleEndTurn}>End Turn</button>} */}
      </div>
      {drawing && <Draw allowDrawing={drawing} pusher={pusher} />}
      {!drawing && <Draw allowDrawing={drawing} pusher={pusher} />}
      <p>Game</p>
      <div></div>
    </div>
  );
};

export default Game;
