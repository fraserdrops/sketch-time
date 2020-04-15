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
  const { id: userID, username, game, gameID } = playerState.context;
  const { players, teams } = game;

  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
      }}
    >
      {/* <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          height: 30,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%'
        }}
      >
        {userID === gameState.playState.currentPlayer && (
          <p>
            You're Up! Draw <span style={{ fontWeight: 'bold' }}>{gameState.playState.word}</span>
          </p>
        )}
        {userID !== gameState.playState.currentPlayer &&
          gameState.teams[userID] === gameState.playState.currentTeam && <p>You're Up! Guess what the word is</p>}
        {gameState.teams[userID] !== gameState.playState.currentTeam && (
          <p>
            {gameState.players[gameState.playState.currentPlayer]} is Drawing {gameState.playState.word}
          </p>
        )}
        {host && <button onClick={handleEndTurn}>End Turn</button>}
      </div>
      {allowDrawing && (
        <Draw allowDrawing={allowDrawing} pusher={pusher} drawerID={gameState.playState.currentPlayer} />
      )}
      {!allowDrawing && (
        <Draw allowDrawing={allowDrawing} pusher={pusher} drawerID={gameState.playState.currentPlayer} />
      )} */}
      <p>Game</p>
    </div>
  );
};

export default Game;
