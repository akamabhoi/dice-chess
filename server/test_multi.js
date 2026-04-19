const { io } = require('socket.io-client');

async function test() {
  const socket1 = io('http://localhost:8080');
  const socket2 = io('http://localhost:8080');
  
  socket1.on('connect', () => {
    console.log('Player 1 connected');
    socket1.emit('create_game', { config: { mode: 'pvp', timeControl: 10 }, userId: 'p1' }, (res) => {
      console.log('Game created:', res.sessionId);
      
      socket1.on('game_state', state => console.log('P1 received game_state, players:', state.players));
      
      socket1.emit('join_game', { sessionId: res.sessionId, userId: 'p1' });

      // After P1 joins, P2 connects
      setTimeout(() => {
        console.log('Player 2 attempting to join');
        socket2.on('game_state', state => console.log('P2 received game_state, players:', state.players));
        socket2.emit('join_game', { sessionId: res.sessionId, userId: 'p2' }, (res2) => {
           console.log('Player 2 join callback:', res2);
        });
      }, 500);
    });
  });
}

test();
