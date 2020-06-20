import Head from 'next/head';
import { useRouter } from 'next/router';
import Pusher from 'pusher-js';
import React, { useEffect, useRef, useState } from 'react';
import { State } from 'xstate';
import '../styles.css';

export const pusher = new Pusher('3a40fa337322e97d8d0c', {
  cluster: 'ap4',
  forceTLS: true,
});

function MyApp({ Component, pageProps }) {
  const ref = useRef();

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

  const router = useRouter();
  const [resolvedState, setResolvedState] = useState(undefined);
  useEffect(() => {
    // the query object doesn't populate on the first render
    if (router.query.gameID) {
      const savedGame = window.localStorage.getItem(router.query.gameID + '^' + router.query.playerID);
      if (savedGame) {
        const stateDefinition = JSON.parse(savedGame);
        setResolvedState(stateDefinition);
      } else {
        setResolvedState(null);
      }
    } else if (!router.asPath.includes('gameID=')) {
      // if it includes gameID, wait for the second render
      // otherwise if there isn't there's no state to load
      setResolvedState(null);
    }
  }, [router.query.gameID]);

  return (
    <div
      ref={ref}
      style={{
        height: '100vh',
        width: '100vw',
        overscrollBehaviorX: 'none',
      }}
    >
      <Head>
        <meta
          name='viewport'
          content='width=device-width, initial-scale=1.0, maximum-scale=1.0,user-scalable=0'
          key='viewport'
        />
      </Head>
      {resolvedState !== undefined && <Component {...pageProps} resolvedState={resolvedState} />}
      {!resolvedState && <div />}
    </div>
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
