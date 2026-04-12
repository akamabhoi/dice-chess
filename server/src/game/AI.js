const { Chess } = require('chess.js');

const PIECE_VALUES = {
  p: 10,
  n: 30,
  b: 30,
  r: 50,
  q: 90,
  k: 900
};

class AI {
  static evaluateBoard(chess, aiColor) {
    let score = 0;
    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece) {
          const val = PIECE_VALUES[piece.type];
          // We evaluate from the AI's perspective
          score += piece.color === aiColor ? val : -val;
        }
      }
    }
    // Add mobility roughly
    if (chess.isCheckmate()) {
      score += chess.turn() !== aiColor ? 1000 : -1000;
    }
    return score;
  }

  static minimax(chess, depth, alpha, beta, isMaximizingPlayer, allowedPieceTypes, aiColor) {
    if (depth === 0 || chess.isGameOver()) {
      return AI.evaluateBoard(chess, aiColor);
    }

    // If it's the root call, we constrain moves by `allowedPieceTypes`.
    // In deeper depths, we don't know the future dice rolls, so we just use ALL legal moves to evaluate the position.
    // This is because we can't reliably predict dice, evaluating with all moves gives a general "good position" heuristic.
    let moves = chess.moves({ verbose: true });
    
    if (allowedPieceTypes) {
      moves = moves.filter(m => allowedPieceTypes.includes(m.piece));
    }

    if (moves.length === 0) {
      // If we have no moves due to dice constraints, but no checkmate, return current eval.
      return AI.evaluateBoard(chess, aiColor);
    }

    if (isMaximizingPlayer) {
      let maxEval = -Infinity;
      for (let move of moves) {
        chess.move(move);
        let ev = AI.minimax(chess, depth - 1, alpha, beta, false, null, aiColor);
        chess.undo();
        maxEval = Math.max(maxEval, ev);
        alpha = Math.max(alpha, ev);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (let move of moves) {
        chess.move(move);
        let ev = AI.minimax(chess, depth - 1, alpha, beta, true, null, aiColor);
        chess.undo();
        minEval = Math.min(minEval, ev);
        beta = Math.min(beta, ev);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  static getBestMove(chessInstance, activeRolls, difficulty, aiColor) {
    // Standard JS chess eval is extremely slow. We strictly cap depth 
    // to prevent freezing the Node.js event thread.
    // Depth 3 evaluates ~4,500+ nodes instantaneously.
    // Depth 4 evaluates ~135,000 nodes (~1 second).
    const depthMap = { Easy: 1, Medium: 2, Hard: 4 };
    const depth = depthMap[difficulty] || 2;
    
    // We clone the board so we don't mutate the live game state during search
    const clone = new Chess(chessInstance.fen());

    // Only consider moves for pieces that were rolled
    let legalMoves = clone.moves({ verbose: true });
    let allowedMoves = legalMoves.filter(m => activeRolls.includes(m.piece));

    if (allowedMoves.length === 0) return null; // Should not happen

    let bestScore = -Infinity;
    let bestMove = allowedMoves[0];

    for (let move of allowedMoves) {
      clone.move(move);
      // We start minimax from the opponent's turn, which is a minimizing turn since AI is maximizing score.
      let score = AI.minimax(clone, depth - 1, -Infinity, Infinity, false, null, aiColor);
      clone.undo();

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }
}

module.exports = AI;
