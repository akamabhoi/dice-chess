import React, { useState, useEffect, useMemo } from 'react';
import { Chess } from 'chess.js';

const PIECE_URLS = {
  w: {
    k: 'https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg',
    q: 'https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg',
    r: 'https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg',
    b: 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg',
    n: 'https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg',
    p: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg'
  },
  b: {
    k: 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg',
    q: 'https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg',
    r: 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg',
    b: 'https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg',
    n: 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_ndt45.svg',
    p: 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg'
  }
};

export default function Board({ 
  fen, 
  playerColor, 
  turnPhase, 
  turnColor,
  inCheck,
  selectedPieceType, 
  onMove 
}) {
  // Synchronously compute chess instance on prop update to avoid 1-frame visual teleportation glitches
  const chess = useMemo(() => {
    try {
      if (fen) return new Chess(fen);
    } catch(e) {}
    return new Chess();
  }, [fen]);

  const [selectedSquare, setSelectedSquare] = useState(null);
  const [validMoves, setValidMoves] = useState([]);

  const isMyTurn = playerColor === turnColor;
  
  // Board orientation
  const ranks = playerColor === 'b' ? [1,2,3,4,5,6,7,8] : [8,7,6,5,4,3,2,1];
  const files = playerColor === 'b' ? ['h','g','f','e','d','c','b','a'] : ['a','b','c','d','e','f','g','h'];

  const boardArray = chess.board();

  // Highlight logic
  useEffect(() => {
    if (selectedSquare) {
      const piece = chess.get(selectedSquare);
      // Ensure we only highlight if the piece matches selectedPieceType
      if (piece && piece.type === selectedPieceType && piece.color === playerColor && isMyTurn && turnPhase === 'waiting_for_move') {
        const moves = chess.moves({ square: selectedSquare, verbose: true });
        setValidMoves(moves.map(m => m.to));
      } else {
        setValidMoves([]);
        if (!piece || piece.type !== selectedPieceType) {
           setSelectedSquare(null); // deselect if invalid
        }
      }
    } else {
      setValidMoves([]);
    }
  }, [selectedSquare, selectedPieceType, chess, playerColor, isMyTurn, turnPhase]);

  const handleSquareClick = (square) => {
    if (!isMyTurn || turnPhase !== 'waiting_for_move') return;

    // If clicking a valid move destination
    if (validMoves.includes(square) && selectedSquare) {
      onMove({
        source: selectedSquare,
        target: square,
        pieceType: selectedPieceType,
        promotion: 'q' // Auto promote to queen for simplicity
      });
      setSelectedSquare(null);
      return;
    }

    // Selecting a piece
    const piece = chess.get(square);
    if (piece && piece.color === playerColor && piece.type === selectedPieceType) {
      setSelectedSquare(square);
    } else {
      setSelectedSquare(null);
    }
  };

  return (
    <div style={{
      width: '100%',
      maxWidth: '500px',
      aspectRatio: '1/1',
      display: 'grid',
      gridTemplateColumns: 'repeat(8, 1fr)',
      gridTemplateRows: 'repeat(8, 1fr)',
      border: '4px solid var(--board-dark)',
      borderRadius: '8px',
      overflow: 'hidden',
      boxShadow: '0 12px 40px rgba(0,0,0,0.5)'
    }}>
      {ranks.map((rank, rIdx) => (
        files.map((file, fIdx) => {
          const square = `${file}${rank}`;
          const isLight = (rIdx + fIdx) % 2 === 0;
          const piece = chess.get(square);
          
          const isSelected = selectedSquare === square;
          const isValidDest = validMoves.includes(square);
          const isKingInCheck = inCheck && piece && piece.type === 'k' && piece.color === turnColor;
          
          // Pieces matching selected type throb slightly to indicate they are playable
          const isPlayableMatch = isMyTurn && turnPhase === 'waiting_for_move' && piece && piece.color === playerColor && piece.type === selectedPieceType;

          let bg = isLight ? 'var(--board-sq-light)' : 'var(--board-sq-dark)';
          if (isSelected) bg = 'var(--board-sq-highlight)';
          if (isValidDest) bg = 'var(--board-sq-valid)';
          if (isKingInCheck) bg = 'rgba(255, 0, 85, 0.6)'; // Red alert

          return (
            <div 
              key={square}
              onClick={() => handleSquareClick(square)}
              style={{
                background: bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.5rem',
                cursor: (isPlayableMatch || isValidDest) ? 'pointer' : 'default',
                userSelect: 'none',
                position: 'relative',
                transition: 'background 0.2s',
              }}
            >
              {isValidDest && !piece && (
                <div style={{ width: '20%', height: '20%', borderRadius: '50%', background: 'rgba(0,0,0,0.2)' }} />
              )}
              
              {piece && (
                <img 
                  src={PIECE_URLS[piece.color][piece.type]}
                  alt={`${piece.color} ${piece.type}`}
                  draggable={false}
                  className={isPlayableMatch && !isSelected ? 'pulse-piece' : ''}
                  style={{ width: '80%', height: '80%', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}
                />
              )}
            </div>
          );
        })
      ))}
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.15); filter: drop-shadow(0 0 8px var(--accent-cyan)); }
          100% { transform: scale(1); }
        }
        .pulse-piece {
          display: inline-block;
          animation: pulse 1.5s infinite;
        }
      `}</style>
    </div>
  );
}
