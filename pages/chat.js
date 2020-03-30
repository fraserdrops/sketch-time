import ChatList from '../components/ChatList';
import ChatBox from '../components/ChatBox';
import Pusher from 'pusher-js';
import { useState, useEffect } from 'react';

const App = props => {
  const [text, setText] = useState('');
  const [chats, setChats] = useState([]);
  const [color, setColor] = useState('black');
  const username = 'Anonymous';

  useEffect(() => {
    let pusher = new Pusher('3a40fa337322e97d8d0c', {
      cluster: 'ap4',
      forceTLS: true
    });
    const channel = pusher.subscribe('chat');
    channel.bind('message', data => {
      setChats(chats => [...chats, data]);
    });
  }, []);

  const handleTextChange = async e => {
    if (e.keyCode === 13) {
      const payload = {
        username: username,
        message: text
      };
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        console.error('event not sent');
      }
    } else {
      setText(e.target.value);
    }
  };
  return (
    <div className='App'>
      <header className='App-header'>
        <h1 className='App-title' style={{ color }}>
          Welcome to React-Pusher Chat
        </h1>
      </header>
      <section>
        <ChatList chats={chats} />
        <ChatBox text={text} username={username} handleTextChange={handleTextChange} />
      </section>
    </div>
  );
};

export default App;
