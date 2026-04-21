import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import Board from '../components/Board';
import DiceController from '../components/DiceController';
import { Timer, ArrowLeft, Trophy } from 'lucide-react';

const STARTING_PIECES = { p: 8, n: 2, b: 2, r: 2, q: 1 };
const PIECE_URLS_W = {
  p: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg',
  n: 'https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg',
  b: 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg',
  r: 'https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg',
  q: 'https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg',
};
const PIECE_URLS_B = {
  p: 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg',
  n: 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_ndt45.svg',
  b: 'https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg',
  r: 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg',
  q: 'https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg',
};

function getCapturedPieces(fen) {
   const counts = { w: { p:0, n:0, b:0, r:0, q:0 }, b: { p:0, n:0, b:0, r:0, q:0 } };
   const boardPart = fen.split(' ')[0];
   for (let char of boardPart) {
      if (char >= 'a' && char <= 'z' && counts.b[char] !== undefined) counts.b[char]++;
      if (char >= 'A' && char <= 'Z' && counts.w[char.toLowerCase()] !== undefined) counts.w[char.toLowerCase()]++;
   }
   
   const captured = { w: {}, b: {} };
   for (let p of ['p', 'n', 'b', 'r', 'q']) {
      const capW = STARTING_PIECES[p] - counts.w[p];
      if (capW > 0) captured.w[p] = capW;
      
      const capB = STARTING_PIECES[p] - counts.b[p];
      if (capB > 0) captured.b[p] = capB;
   }
   return captured;
}

const renderCaptured = (capturedObj, playerColorWorB) => {
   const missing = playerColorWorB === 'w' ? capturedObj.b : capturedObj.w;
   const urls = playerColorWorB === 'w' ? PIECE_URLS_B : PIECE_URLS_W;
   const elements = [];
   const order = ['p', 'n', 'b', 'r', 'q'];
   order.forEach(p => {
       if (missing[p]) {
           for(let i=0; i<missing[p]; i++) {
               elements.push(
                 <img 
                   key={`${p}-${i}`} 
                   src={urls[p]} 
                   alt={`Captured ${p}`} 
                   draggable={false}
                   style={{ width: '1.5rem', height: '1.5rem', marginLeft: '-6px', filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.5))' }}
                 />
               );
           }
       }
   });
   return <div style={{ display: 'flex', height: '1.5rem', paddingLeft: '6px' }}>{elements}</div>;
}

const MoveHistory = ({ history }) => {
   const turns = [];
   if (history) {
     for (let i=0; i<history.length; i+=2) {
         turns.push({
             white: history[i].move.san,
             black: history[i+1] ? history[i+1].move.san : ''
         });
     }
   }
   return (
      <div className="glass-panel area-history" style={{ padding: '1rem' }}>
         <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--accent-cyan)' }}>Move History</h3>
         {turns.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No moves yet</p> : (
            <div className="history-moves-list">
               {turns.map((t, idx) => (
                  <div key={idx} className="move-turn">
                     <span style={{ color: 'var(--text-muted)', width: '30px', flexShrink: 0 }}>{idx + 1}.</span>
                     <span style={{ padding: '0 0.4rem', flexShrink: 0 }}>{t.white}</span>
                     <span style={{ padding: '0 0.4rem', flexShrink: 0 }}>{t.black}</span>
                  </div>
               ))}
            </div>
         )}
      </div>
   )
}

function formatTime(ms) {
  if (ms <= 0) return '00:00';
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
  const s = (totalSec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function Game() {
  const { sessionId } = useParams();
  const { socket, gameState, userId } = useSocket();
  const navigate = useNavigate();

  const [localTimers, setLocalTimers] = useState({ white: 0, black: 0, lastTick: Date.now() });
  const [selectedPieceType, setSelectedPieceType] = useState(null);

  useEffect(() => {
    // Catch browser back button cleanly without triggering on React StrictMode unmounts
    const handlePopState = () => {
      if (socket) {
        socket.emit('leave_game', { sessionId });
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [socket, sessionId]);

  useEffect(() => {
    if (!socket || !userId) return;
    if (!gameState) {
      // attempt re-join
      socket.emit('join_game', { sessionId, userId });
    }
  }, [socket, sessionId, gameState, userId]);

  // Sync timers from server authoritative state
  useEffect(() => {
    if (gameState?.timers) {
      setLocalTimers({ ...gameState.timers, lastTick: Date.now() });
    }
    // Clear selection on new turn
    setSelectedPieceType(null);
  }, [gameState]);

  // Local timer tick
  useEffect(() => {
    if (!gameState) return;
    if (gameState.isGameOver || gameState.turnPhase === 'rolling') return;

    const interval = setInterval(() => {
      setLocalTimers(prev => {
        const now = Date.now();
        const delta = now - prev.lastTick;
        const activeColor = gameState.turnColor === 'w' ? 'white' : 'black';
        
        return {
          ...prev,
          [activeColor]: Math.max(0, prev[activeColor] - delta),
          lastTick: now
        };
      });
    }, 100);

    return () => clearInterval(interval);
  }, [gameState]);

  if (!gameState) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Game...</div>;
  }

  const myColor = userId === gameState.players.white ? 'w' : (userId === gameState.players.black ? 'b' : 'spectator');
  const isMyTurn = myColor === gameState.turnColor;

  const isFirstMount = React.useRef(true);
  const lastHistoryLength = React.useRef(0);

  useEffect(() => {
    if (gameState?.history) {
      const currentLen = gameState.history.length;
      if (!isFirstMount.current && currentLen > lastHistoryLength.current) {
         // A new move was made, play sound
         const latestTurn = gameState.history[currentLen - 1];
         if (latestTurn?.move) {
           const san = latestTurn.move.san || '';
           const moveColor = latestTurn.move.color;
           const isSelf = moveColor === myColor;
           
           let soundUrl = isSelf ? 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-self.mp3' : 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-opponent.mp3';
           if (san.includes('x')) soundUrl = 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/capture.mp3';
           if (san.includes('+') || san.includes('#')) soundUrl = 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-check.mp3';
           
           new Audio(soundUrl).play().catch(e => console.log('Audio overlap ignored'));
         }
      }
      lastHistoryLength.current = currentLen;
      isFirstMount.current = false;
    }
  }, [gameState?.history, myColor]);

  const handleRoll = () => {
    if (!socket) return;
    socket.emit('roll_dice');
  };

  const handleMove = (moveInfo) => {
    if (!socket) return;
    socket.emit('submit_move', moveInfo);
  };

  const opponentColor = myColor === 'w' ? 'black' : 'white';
  const myColorKey = myColor === 'spectator' ? 'spectator' : (myColor === 'w' ? 'white' : 'black');

  const capturedPieces = getCapturedPieces(gameState.fen);

  return (
    <div className="game-wrapper" style={{ padding: '2rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      {/* Header bar */}
      <div className="area-header" style={{ width: '100%', maxWidth: '900px', display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', zIndex: 10 }}>
        <button className="btn" style={{ padding: '0.5rem' }} onClick={() => {
          if (socket) socket.emit('leave_game', { sessionId });
          navigate('/');
        }} title="Leave">
          <ArrowLeft size={20} />
        </button>
        {gameState.inCheck && !gameState.isGameOver && (
          <div style={{ color: 'var(--accent-red)', fontWeight: 'bold', fontSize: '1.2rem', animation: 'pulse 1s infinite' }}>CHECK</div>
        )}
      </div>

      <div className="game-grid-container">
        
        <div className="left-column">
          <div className="glass-panel player-tracker area-opponent" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontWeight: 600 }}>Opponent ({opponentColor})</div>
              {renderCaptured(capturedPieces, opponentColor === 'white' ? 'w' : 'b')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'monospace', fontSize: '1.5rem', color: localTimers[opponentColor] < 60000 ? 'var(--accent-red)' : 'var(--text-main)' }}>
              <Timer size={24} /> {formatTime(localTimers[opponentColor])}
            </div>
          </div>

          <div className="area-board">
            <Board 
              fen={gameState.fen}
              playerColor={myColor === 'spectator' ? 'w' : myColor}
              turnPhase={gameState.turnPhase}
              turnColor={gameState.turnColor}
              inCheck={gameState.inCheck}
              selectedPieceType={selectedPieceType}
              onMove={handleMove}
            />
          </div>

          <div className="glass-panel player-tracker area-player" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderColor: isMyTurn ? 'var(--accent-cyan)' : 'var(--glass-border)' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontWeight: 600 }}>You ({myColorKey})</div>
              {renderCaptured(capturedPieces, myColorKey === 'white' ? 'w' : 'b')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'monospace', fontSize: '1.5rem', color: (myColorKey !== 'spectator' && localTimers[myColorKey] < 60000) ? 'var(--accent-red)' : 'var(--accent-cyan)' }}>
              <Timer size={24} /> {myColorKey !== 'spectator' ? formatTime(localTimers[myColorKey] || 0) : '--:--'}
            </div>
          </div>
        </div>

        <div className="right-column">
          <div className="area-dice">
            <DiceController 
              onRoll={handleRoll}
              activeRolls={gameState.activeRolls}
              rollCount={gameState.rollCount}
              turnPhase={gameState.turnPhase}
              isMyTurn={isMyTurn}
              turnColor={gameState.turnColor}
              inCheck={gameState.inCheck}
              selectedPieceType={selectedPieceType}
              onSelectPieceType={setSelectedPieceType}
            />
          </div>

          <MoveHistory history={gameState.history} />
        </div>
        
      </div>

        {/* Game Over Screen Overlay */}
        {gameState.isGameOver && (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.8)', zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <div className="glass-panel text-center" style={{ 
              padding: '3rem', maxWidth: '400px', 
              border: `2px solid ${gameState.winner === myColorKey ? 'var(--accent-cyan)' : 'var(--accent-purple)'}`,
              animation: 'victory-pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
              boxShadow: gameState.winner === myColorKey ? '0 0 50px rgba(0, 240, 255, 0.3)' : '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}>
              <Trophy size={64} className="mb-4" style={{ 
                color: 'gold', margin: '0 auto',
                animation: gameState.winner === myColorKey ? 'trophy-glow 2s infinite' : 'none'
              }} />
              <h2 style={{ color: '#fff' }}>Game Over</h2>
              <p style={{ fontSize: '1.5rem', marginBottom: '2rem', fontWeight: 'bold' }}>
                {gameState.winner === null ? 'Draw!' : (
                   myColorKey === 'spectator' ? 
                     <span style={{ color: 'var(--accent-cyan)' }}>{gameState.winner.charAt(0).toUpperCase() + gameState.winner.slice(1)} won!</span> :
                   (gameState.winner === myColorKey ? 
                     <span style={{ color: 'var(--accent-cyan)' }}>You won!</span> : 
                     <span style={{ color: 'var(--accent-red)' }}>You lose!</span>)
                )}
              </p>
              {gameState.canRematch ? (
                <button className="btn btn-primary" onClick={() => socket.emit('request_rematch')} style={{ width: '100%', padding: '1rem' }}>
                  Request Rematch
                </button>
              ) : (
                <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                   Opponent left the room. Rematch unavailable.
                </div>
              )}
              <button className="btn mt-4" onClick={() => {
                if (socket) socket.emit('leave_game', { sessionId });
                navigate('/');
              }} style={{ width: '100%' }}>
                Home
              </button>
            </div>
          </div>
        )}

      </div>
  );
}
