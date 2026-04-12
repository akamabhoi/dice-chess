import React, { useState, useEffect } from 'react';

const PIECE_URLS_W = {
  p: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg',
  n: 'https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg',
  b: 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg',
  r: 'https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg',
  q: 'https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg',
  k: 'https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg'
};

const PIECE_URLS_B = {
  p: 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg',
  n: 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_ndt45.svg',
  b: 'https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg',
  r: 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg',
  q: 'https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg',
  k: 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg'
};

const PIECE_NAMES = {
  p: 'Pawn', n: 'Knight', b: 'Bishop', r: 'Rook', q: 'Queen', k: 'King'
};

const FUNNY_COMMENTS = [
  "Opponent is computing string theory...",
  "Opponent is consulting a grandmaster...",
  "Opponent is updating their Windows...",
  "Opponent is trying to remember how the Knight moves...",
  "Opponent is calculating 14,000,605 futures...",
  "Opponent is sweating profusely...",
  "Opponent is playing mind games..."
];

export default function DiceController({ 
  onRoll, 
  activeRolls, 
  rollCount, 
  turnPhase, 
  isMyTurn, 
  turnColor,
  inCheck,
  selectedPieceType,
  onSelectPieceType
}) {
  const [animating, setAnimating] = useState(false);
  const [commentIndex, setCommentIndex] = useState(0);

  useEffect(() => {
    if (turnPhase === 'waiting_for_move' && !isMyTurn) {
      const interval = setInterval(() => {
        setCommentIndex(i => (i + 1) % FUNNY_COMMENTS.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [turnPhase, isMyTurn]);

  useEffect(() => {
    if (turnPhase === 'rolling') {
      setAnimating(true);
      
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioContext();
        
        // Synthesize stunningly realistic dice tumbling noise using sculpted noise bursts
        const duration = 0.5;
        const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        // Define random impact times (rapid tumbles)
        const impacts = [0.0, 0.08, 0.15, 0.22, 0.31, 0.42];
        
        for (let i = 0; i < data.length; i++) {
            const t = i / ctx.sampleRate;
            let env = 0;
            for (const impact of impacts) {
                if (t > impact) {
                   env += Math.exp(-(t - impact) * 80) * (1 - impact*1.2); 
                }
            }
            data[i] = (Math.random() * 2 - 1) * env * 1.5;
        }
        
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        
        // Filter the noise to sound like heavy plastic dice hitting a hollow tray
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1600; // Woody/plastic center frequency
        filter.Q.value = 1.0; 
        
        source.connect(filter);
        filter.connect(ctx.destination);
        source.start(ctx.currentTime);
      } catch (e) {}

      // Let animation play for 500ms
      const timer = setTimeout(() => {
        setAnimating(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [turnPhase]);

  const handleRollClick = () => {
    if (isMyTurn && turnPhase !== 'rolling' && rollCount < 3) {
      onRoll();
    }
  };

  const getRollButtonText = () => {
    if (!isMyTurn) return "Opponent's Turn";
    if (turnPhase === 'rolling') return 'Rolling...';
    if (rollCount === 0) return 'Roll Dice';
    if (rollCount === 1) return 'Roll 2 (Optional)';
    if (rollCount === 2) return 'Final Roll!';
    return 'Waiting for move';
  };

  return (
    <div className="glass-panel" style={{ padding: '1rem', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', minHeight: '80px', alignItems: 'center' }}>
        {turnPhase === 'waiting_for_roll' && rollCount === 0 && (
          <div style={{ color: 'var(--text-muted)' }}>
            {isMyTurn ? "Roll dice to see which pieces can move." : "Waiting for opponent to roll..."}
          </div>
        )}
        
        {turnPhase === 'rolling' && [1, 2, 3].map(i => (
          <div key={i} className="dice-tumble" style={getDiceStyle(turnColor)} />
        ))}

        {turnPhase === 'waiting_for_move' && activeRolls && activeRolls.map((type, i) => {
          const isSelected = selectedPieceType === type;
          const isKingLocked = inCheck && type === 'k'; // Rough approximation visually if k is locked
          
          const baseStyle = getDiceStyle(turnColor);
          return (
            <div 
              key={i} 
              style={{
                ...baseStyle, 
                border: isSelected ? '3px solid var(--accent-cyan)' : '3px solid transparent',
                background: isSelected ? (turnColor === 'w' ? 'rgba(0, 240, 255, 0.3)' : 'rgba(150, 240, 255, 0.9)') : baseStyle.background,
                transform: isSelected ? 'scale(1.1)' : 'none',
                cursor: isMyTurn ? 'pointer' : 'default',
                position: 'relative'
              }}
              onClick={() => isMyTurn && onSelectPieceType(type)}
            >
              {isKingLocked && (
                <div style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'var(--accent-red)', width: '10px', height: '10px', borderRadius: '50%' }} />
              )}
              <img 
                src={turnColor === 'b' ? PIECE_URLS_B[type] : PIECE_URLS_W[type]} 
                alt={type} 
                draggable={false}
                style={{ width: '80%', height: '80%', filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.5))' }}
              />
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '0.9rem', color: 'var(--accent-purple)' }}>
          {rollCount > 0 ? `Roll ${rollCount} / 3` : ''}
        </div>
        
        <button 
          className="btn btn-primary"
          style={{ padding: '0.5rem 2rem', opacity: (!isMyTurn || turnPhase === 'rolling' || rollCount >= 3) ? 0.5 : 1 }}
          onClick={handleRollClick}
          disabled={!isMyTurn || turnPhase === 'rolling' || rollCount >= 3}
        >
          {getRollButtonText()}
        </button>
      </div>
      
      {turnPhase === 'waiting_for_move' && isMyTurn && !selectedPieceType && (
        <div style={{ textAlign: 'center', color: 'var(--accent-cyan)', fontSize: '0.9rem' }}>
          Select a die to highlight valid piece moves!
        </div>
      )}
      {turnPhase === 'waiting_for_move' && !isMyTurn && (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', minHeight: '20px', transition: 'opacity 0.2s' }}>
          {FUNNY_COMMENTS[commentIndex]}
        </div>
      )}
    </div>
  );
}

const getDiceStyle = (turnColor) => ({
  width: '64px',
  height: '64px',
  background: turnColor === 'w' ? 'rgba(30, 30, 40, 0.95)' : 'rgba(230, 235, 240, 0.95)',
  borderRadius: '12px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '2.5rem',
  boxShadow: turnColor === 'w' 
    ? 'inset 0 2px 4px rgba(255,255,255,0.1), 0 4px 12px rgba(0,0,0,0.5)'
    : 'inset 0 2px 4px rgba(255,255,255,0.8), 0 4px 12px rgba(0,0,0,0.5)',
  transition: 'all 0.2s ease',
  color: turnColor === 'w' ? '#fff' : '#000',
  boxSizing: 'border-box'
});
