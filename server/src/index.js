const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const GameEngine = require('./game/Engine');

const app = express();

const corsOptions = {
  origin: function (origin, callback) {
    const allowed = [
      'https://dice-chess-nine.vercel.app',
      'https://dice-chess-production.up.railway.app'
    ];
    // Accept standard production origins, OR any localhost origin (5173, 5174, etc), OR no-origin (non-browser tools)
    if (!origin || allowed.includes(origin) || origin.startsWith('http://localhost:')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

app.use(cors(corsOptions));

const server = http.createServer(app);
const io = new Server(server, {
  cors: corsOptions
});

// In-memory session store
const sessions = new Map();

// Helper to generate 6-character alphanumeric code
function generateSessionCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('create_game', (payload, callback) => {
    const { config, userId } = payload;
    let sessionId;
    do {
      sessionId = generateSessionCode();
    } while (sessions.has(sessionId));

    const game = new GameEngine(sessionId, config, io);
    sessions.set(sessionId, game);

    // Auto-join the creator
    game.joinPlayer(socket, 'white', userId);

    if (callback) callback({ sessionId });
  });

  socket.on('join_game', (payload, callback) => {
    const { sessionId, userId } = payload;
    const game = sessions.get(sessionId);
    if (!game) {
      if (callback) callback({ error: 'Game not found' });
      return;
    }

    console.log(`[join_game] Session: ${sessionId}, User: ${userId}`);
    // In PvE, only 'white' should be joined by the actual player.
    // In PvP, the second player joins as 'black'.
    if (game.config.mode === 'pvp' && !game.players.black && game.players.white !== userId) {
      console.log(`[join_game] Assigning user ${userId} to black`);
      game.joinPlayer(socket, 'black', userId);
    } else if (game.config.mode === 'pve' && game.players.white !== userId) {
      if (callback) callback({ error: 'Match in progress. Play with someone else.' });
      return;
    } else if (game.players.white !== userId && game.players.black !== userId) {
      if (callback) callback({ error: 'Match in progress. Play with someone else.' });
      return;
    } else if (game.players.white === userId) {
      console.log(`[join_game] Re-joining user ${userId} to white`);
      game.sockets.white = socket.id;
      socket.join(game.sessionId);   // re-join room to receive future broadcasts
      game.attachSocketListeners(socket, userId);
      game.broadcastState();         // send current state immediately to this player
    } else if (game.players.black === userId) {
      console.log(`[join_game] Re-joining user ${userId} to black`);
      game.sockets.black = socket.id;
      socket.join(game.sessionId);   // re-join room to receive future broadcasts
      game.attachSocketListeners(socket, userId);
      game.broadcastState();         // send current state immediately to this player
    }

    if (callback) callback({ success: true, state: game.getState() });
  });

  // Most other events are handled directly by the GameEngine after a socket is bound to a game.
  // GameEngine will register listeners on the player's socket when they join.

  socket.on('leave_game', (payload) => {
    const { sessionId } = payload || {};
    if (sessionId) {
      const game = sessions.get(sessionId);
      if (game) {
        game.handleDisconnect(socket.id);
      }
    } else {
      for (const game of sessions.values()) {
        game.handleDisconnect(socket.id);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    for (const [sessionId, game] of sessions.entries()) {
      // Only trigger forfeit logic for known registered players — never for rejected 3rd-party sockets
      const isPlayer = game.sockets.white === socket.id || game.sockets.black === socket.id;
      if (isPlayer) {
        game.handleDisconnect(socket.id);
      }
    }
  });
});

app.get('/', (req, res) => {
  res.json({ status: 'Dice Chess server is running' });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Dice Chess server running on host 0.0.0.0 and port ${PORT}`);
});
