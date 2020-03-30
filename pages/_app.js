import React, { useState } from 'react';
import { v4 as uuid } from 'uuid';

// import App from 'next/app'
export const GameContext = React.createContext();

function MyApp({ Component, pageProps }) {
  const [userID] = useState(uuid());
  console.log(userID);
  const [gameState, setGameState] = useState({
    teams: {},
    playState: { currentPlayer: undefined, currentTeam: undefined }
  });
  return (
    <GameContext.Provider value={{ gameState, setGameState, userID }}>
      <Component {...pageProps} />
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
