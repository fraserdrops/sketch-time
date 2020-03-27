import ChatList from '../components/ChatList';
import ChatBox from '../components/ChatBox';
import Pusher from 'pusher-js';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      text: '',
      username: '',
      chats: []
    };
  }

  componentDidMount() {
    const username = window.prompt('Username: ', 'Anonymous');
    this.setState({ username });
    let pusher = new Pusher('3a40fa337322e97d8d0c', {
      cluster: 'ap4',
      forceTLS: true
    });
    const channel = pusher.subscribe('chat');
    channel.bind('message', data => {
      this.setState({ chats: [...this.state.chats, data], test: '' });
    });
  }

  render() {
    const handleTextChange = async e => {
      if (e.keyCode === 13) {
        const payload = {
          username: this.state.username,
          message: this.state.text
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
        this.setState({ text: e.target.value });
      }
    };
    return (
      <div className='App'>
        <header className='App-header'>
          <h1 className='App-title'>Welcome to React-Pusher Chat</h1>
        </header>
        <section>
          <ChatList chats={this.state.chats} />
          <ChatBox text={this.state.text} username={this.state.username} handleTextChange={handleTextChange} />
        </section>
      </div>
    );
  }
}

export default App;
