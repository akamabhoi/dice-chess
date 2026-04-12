const { Chess } = require('chess.js');
const AI = require('./AI');

const TURN_PHASES = {
  WAITING_FOR_ROLL: 'waiting_for_roll',
  ROLLING: 'rolling', // Timers pause
  WAITING_FOR_MOVE: 'waiting_for_move',
  GAME_OVER: 'game_over'
};

class GameEngine {
  constructor(sessionId, config, io) {
    this.sessionId = sessionId;
    this.io = io;
    this.config = config; // { timeControl: 10 or 15, mode: 'pvp' or 'pve', difficulty: 'Easy'|'Medium'|'Hard' }
    
    this.chess = new Chess();
    
    this.players = {
      white: null,
      black: null
    };
    
    this.sockets = {
      white: null,
      black: null
    };
    
    this.timerInterval = null;
    this.resetGame();

    if (this.config.mode === 'pve') {
      this.players.black = 'AI'; // AI takes black
      this.aiSettings = { difficulty: this.config.difficulty || 'Medium' };
    }
  }

  resetGame() {
    this.chess.reset();
    const timeMs = (this.config.timeControl || 10) * 60 * 1000;
    this.timers = {
      white: timeMs,
      black: timeMs,
      lastTick: null
    };
    
    this.state = {
      fen: this.chess.fen(),
      turnPhase: TURN_PHASES.WAITING_FOR_ROLL,
      activeRolls: [],
      rollCount: 0,
      turnColor: 'w',
      inCheck: false,
      isGameOver: false,
      result: null,
      winner: null,
      canRematch: true
    };
    
    this.history = [];
    this.currentTurnRecord = { fen: this.chess.fen(), rolls: [], move: null };
  }

  joinPlayer(socket, color, userId) {
    if (this.players[color] && this.players[color] !== 'AI' && this.players[color] !== userId) {
       return false; // Slot taken
    }
    this.players[color] = userId;
    this.sockets[color] = socket.id;
    socket.join(this.sessionId);
    this.attachSocketListeners(socket, userId);
    
    // Start game if both present
    if (this.players.white && this.players.black && !this.timerInterval && !this.state.isGameOver) {
      this.startGame();
    }
    this.broadcastState();
    return true;
  }

  attachSocketListeners(socket, userId) {
    socket.on('roll_dice', () => this.handleRollDice(userId));
    socket.on('submit_move', (moveInfo) => this.handleMove(userId, moveInfo));
    socket.on('resign', () => this.handleResign(userId));
    socket.on('request_rematch', () => this.handleRematchRequest(userId));
  }

  startGame() {
    this.state.isGameOver = false;
    this.timers.lastTick = Date.now();
    this.timerInterval = setInterval(() => this.tickTimer(), 100);
    this.broadcastState();

    if (this.config.mode === 'pve' && this.players.white === 'AI') {
      this.triggerAI();
    }
  }

  tickTimer() {
    if (this.state.turnPhase === TURN_PHASES.ROLLING || this.state.turnPhase === TURN_PHASES.GAME_OVER) {
      this.timers.lastTick = Date.now();
      return;
    }
    
    const now = Date.now();
    const delta = now - this.timers.lastTick;
    this.timers.lastTick = now;
    
    const activeColor = this.state.turnColor === 'w' ? 'white' : 'black';
    this.timers[activeColor] -= delta;
    
    // If time is up, end game
    if (this.timers[activeColor] <= 0) {
      this.timers[activeColor] = 0;
      this.endGame('time', activeColor === 'white' ? 'black' : 'white', 'Time forfeit');
    }
  }

  handleRollDice(userId) {
    const isWhite = this.players.white === userId;
    const isBlack = this.players.black === userId;
    const activeColorStr = this.state.turnColor === 'w' ? 'white' : 'black';
    
    if (this.state.turnPhase === TURN_PHASES.GAME_OVER) return;
    if (this.state.turnPhase === TURN_PHASES.ROLLING) return;
    
    if ((this.state.turnColor === 'w' && !isWhite) || (this.state.turnColor === 'b' && !isBlack)) {
      return; // Not their turn
    }
    
    if (this.state.rollCount >= 3) return; // Max rolls reached

    // Proceed to roll
    this.state.turnPhase = TURN_PHASES.ROLLING;
    this.state.activeRolls = []; // hide rolls while animating
    this.broadcastState();

    setTimeout(() => {
      this.generateDiceResult();
      this.state.rollCount++;
      this.state.turnPhase = TURN_PHASES.WAITING_FOR_MOVE;
      
      this.currentTurnRecord.rolls.push([...this.state.activeRolls]);
      this.broadcastState();
    }, 500); // 0.5s animation
  }

  generateDiceResult() {
    const squares = ['a1','b1','c1','d1','e1','f1','g1','h1','a2','b2','c2','d2','e2','f2','g2','h2','a3','b3','c3','d3','e3','f3','g3','h3','a4','b4','c4','d4','e4','f4','g4','h4','a5','b5','c5','d5','e5','f5','g5','h5','a6','b6','c6','d6','e6','f6','g6','h6','a7','b7','c7','d7','e7','f7','g7','h7','a8','b8','c8','d8','e8','f8','g8','h8'];
    const activePlayerChar = this.state.turnColor;
    
    let piecesPool = [];
    squares.forEach(sq => {
      const piece = this.chess.get(sq);
      if (piece && piece.color === activePlayerChar) {
        const moves = this.chess.moves({ square: sq });
        if (moves.length > 0) {
          piecesPool.push(piece.type);
        }
      }
    });

    if (piecesPool.length === 0) {
      // Should not happen unless game over, but safe fallback
      piecesPool = ['p'];
    }

    const rollDie = () => piecesPool[Math.floor(Math.random() * piecesPool.length)];
    const dice = [];

    if (this.chess.inCheck()) {
      dice.push('k');
      dice.push(rollDie());
      dice.push(rollDie());
    } else {
      for (let i = 0; i < 3; i++) {
        dice.push(rollDie());
      }
    }

    this.state.activeRolls = dice;
  }

  handleMove(userId, moveInfo) {
    const isWhite = this.players.white === userId;
    const isBlack = this.players.black === userId;
    
    if (this.state.turnPhase !== TURN_PHASES.WAITING_FOR_MOVE) return;
    if ((this.state.turnColor === 'w' && !isWhite) || (this.state.turnColor === 'b' && !isBlack)) return;

    const { pieceType, source, target, promotion } = moveInfo;

    if (!this.state.activeRolls.includes(pieceType)) {
      return; // Illegal, piece not rolled
    }
    
    // Check if the piece at the source is actually the piece type picked
    const actualPiece = this.chess.get(source);
    if (!actualPiece || actualPiece.type !== pieceType) {
      return;
    }

    try {
      const move = this.chess.move({
        from: source,
        to: target,
        promotion: promotion || 'q'
      });
      
      if (move) {
        // Valid move
        this.currentTurnRecord.move = move;
        this.history.push({ ...this.currentTurnRecord });
        this.currentTurnRecord = { fen: this.chess.fen(), rolls: [], move: null };
        this.endTurn();
      }
    } catch(e) {
      // Invalid move, silently reject client will see no state change
      if (userId !== 'AI') {
        const socketId = this.sockets[isWhite ? 'white' : 'black'];
        if (socketId) {
          const socket = this.io.sockets.sockets.get(socketId);
          if (socket) socket.emit('move_rejected');
        }
      }
    }
  }

  endTurn() {
    this.state.fen = this.chess.fen();
    this.state.turnColor = this.chess.turn();
    this.state.inCheck = this.chess.inCheck();
    this.state.turnPhase = TURN_PHASES.WAITING_FOR_ROLL;
    this.state.rollCount = 0;
    this.state.activeRolls = [];

    if (this.chess.isCheckmate()) {
      const winner = this.state.turnColor === 'w' ? 'black' : 'white';
      this.endGame('checkmate', winner, 'Checkmate');
    } else if (this.chess.isDraw() || this.chess.isStalemate()) {
      this.endGame('draw', null, 'Draw');
    }

    this.broadcastState();

    if (!this.state.isGameOver && this.config.mode === 'pve' && this.state.turnColor === (this.players.white === 'AI' ? 'w' : 'b')) {
      this.triggerAI();
    }
  }

  endGame(reason, winner, message) {
    this.state.isGameOver = true;
    this.state.turnPhase = TURN_PHASES.GAME_OVER;
    this.state.result = reason;
    this.state.winner = winner;
    clearInterval(this.timerInterval);
    this.timerInterval = null;
    this.io.to(this.sessionId).emit('game_over', { reason, winner, message });
    this.broadcastState();
  }

  handleResign(userId) {
    if (this.state.isGameOver) return;
    const isWhite = this.players.white === userId;
    const isBlack = this.players.black === userId;
    if (isWhite) {
      this.endGame('resignation', 'black', 'White resigned');
    } else if (isBlack) {
      this.endGame('resignation', 'white', 'Black resigned');
    }
  }

  handleRematchRequest(userId) {
    if (!this.state.isGameOver) return;
    if (!this.state.canRematch) return;
    
    // Swap colors for fairness (works safely for both PvE and PvP!)
    const oldWhite = this.players.white;
    const oldWhiteSocket = this.sockets.white;
    
    this.players.white = this.players.black;
    this.sockets.white = this.sockets.black;
    
    this.players.black = oldWhite;
    this.sockets.black = oldWhiteSocket;

    this.resetGame();
    this.startGame();
  }

  handleDisconnect(socketId) {
    if (this.state.isGameOver) {
      if (this.config.mode === 'pvp') {
        if (this.sockets.white === socketId || this.sockets.black === socketId) {
          this.state.canRematch = false;
          this.broadcastState();
        }
      }
      return;
    }
    
    // In PvP, if a player fully disconnects (closes tab/navigates away), they auto-forfeit immediately.
    if (this.config.mode === 'pvp') {
      if (this.sockets.white === socketId) {
        this.state.canRematch = false;
        this.endGame('abandonment', 'black', 'White abandoned the match');
      } else if (this.sockets.black === socketId) {
        this.state.canRematch = false;
        this.endGame('abandonment', 'white', 'Black abandoned the match');
      }
    }
  }

  triggerAI() {
    if (this.state.isGameOver) return;
    
    const simulateTurnForAI = (rollIndex) => {
      this.state.turnPhase = TURN_PHASES.ROLLING;
      this.broadcastState();

      setTimeout(() => {
        this.generateDiceResult();
        this.state.rollCount = rollIndex;
        this.state.turnPhase = TURN_PHASES.WAITING_FOR_MOVE;
        this.currentTurnRecord.rolls.push([...this.state.activeRolls]);
        this.broadcastState();
        
        let maxTimeMs = 5000;
        if (this.aiSettings.difficulty === 'Easy') maxTimeMs = 10000;
        else if (this.aiSettings.difficulty === 'Medium') maxTimeMs = 8000;

        const aiColor = this.players.white === 'AI' ? 'w' : 'b';
        let wantsReroll = false;
        if (rollIndex < 3) {
           const bestMove = AI.getBestMove(this.chess, this.state.activeRolls, this.aiSettings.difficulty, aiColor);
           if (!bestMove) {
             wantsReroll = true;
           } else {
             wantsReroll = Math.random() < 0.3;
           }
        }

        if (wantsReroll) {
           this.state.turnPhase = TURN_PHASES.WAITING_FOR_ROLL;
           setTimeout(() => simulateTurnForAI(rollIndex + 1), 1200);
           return;
        }

        const simulateDelayMs = Math.floor(Math.random() * (maxTimeMs - 2000)) + 2000;

        setTimeout(() => {
          const bestMove = AI.getBestMove(this.chess, this.state.activeRolls, this.aiSettings.difficulty, aiColor);
          if (bestMove) {
             this.handleMove('AI', { 
               pieceType: this.chess.get(bestMove.from).type,
               source: bestMove.from,
               target: bestMove.to,
               promotion: bestMove.promotion || 'q'
             });
          }
        }, simulateDelayMs);
      }, 500);
    };

    simulateTurnForAI(1);
  }

  getState() {
    return {
      fen: this.state.fen,
      turnPhase: this.state.turnPhase,
      activeRolls: this.state.activeRolls,
      rollCount: this.state.rollCount,
      turnColor: this.state.turnColor,
      inCheck: this.state.inCheck,
      isGameOver: this.state.isGameOver,
      winner: this.state.winner,
      result: this.state.result,
      canRematch: this.state.canRematch,
      timers: this.timers,
      players: {
        white: this.players.white,
        black: this.players.black
      },
      history: this.history
    };
  }

  broadcastState() {
    this.io.to(this.sessionId).emit('game_state', this.getState());
  }
}

module.exports = GameEngine;
