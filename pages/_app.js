import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuid } from 'uuid';
import Pusher from 'pusher-js';
import '../styles.css';
import Head from 'next/head';

// import App from 'next/app'
export const GameContext = React.createContext();

function MyApp({ Component, pageProps }) {
  const [userID] = useState(uuid());
  const ref = useRef();

  const [gameState, setGameState] = useState({
    gameStatus: 'lobby',
    players: {},
    teams: {},
    playState: { currentPlayer: undefined, currentTeam: undefined },
    username: '',
  });

  useEffect(() => {
    if (window) require('inobounce');

    function preventPullToRefresh(element) {
      var prevent = false;

      element.addEventListener(
        'touchstart',
        function (e) {
          if (e.touches.length !== 1) {
            return;
          }

          var scrollY = window.pageYOffset || document.body.scrollTop || document.documentElement.scrollTop;
          prevent = scrollY === 0;
        },
        { passive: false }
      );

      element.addEventListener(
        'touchmove',
        function (e) {
          if (prevent) {
            prevent = false;
            e.preventDefault();
          }
        },
        { passive: false }
      );
    }

    preventPullToRefresh(ref.current);
  }, []);
  return (
    <GameContext.Provider value={{ gameState, setGameState, userID }}>
      <div
        ref={ref}
        style={{
          height: '100vh',
          width: '100vw',
        }}
      >
        <Head>
          <meta
            name='viewport'
            content='width=device-width, initial-scale=1.0, maximum-scale=1.0,user-scalable=0'
            key='viewport'
          />
        </Head>
        <Component {...pageProps} />
      </div>
    </GameContext.Provider>
  );
}

// Only uncomment this method if you have blocking data requirements for
// every single page in your application. This disables the ability to
// perform automatic static optimization, causing every page in your app to
// be server-side rendered.
//
// MyApp.getInitialProps = async (appContext) => {
//   // calls page's `getInitialProps` and fills `appProps.pageProps`
//   const appProps = await App.getInitialProps(appContext);
//
//   return { ...appProps }
// }

export default MyApp;
