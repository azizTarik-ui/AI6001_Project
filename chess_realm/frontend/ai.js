// ─── PIECE VALUES ─────────────────────────────────────────────

const PIECE_VALUES = {
  "♙": 1,  "♟": -1,
  "♘": 3,  "♞": -3,
  "♗": 3,  "♝": -3,
  "♖": 5,  "♜": -5,
  "♕": 9,  "♛": -9,
  "♔": 0,  "♚": 0,
};

// ─── BOARD HISTORY ────────────────────────────────────────────
// We store a simple string snapshot of every board position
// that has occurred during the game.
// If the AI is about to repeat a position, we penalise it.

const boardHistory = [];

// Convert the board array into a single string.
// This gives us a simple way to compare two board states.
function boardToString(board) {
  return board.map(row => row.join(",")).join("|");
}

// Call this after every move (white and black) to record the position.
function recordBoard(board) {
  boardHistory.push(boardToString(board));
}

// Count how many times this board state has appeared before.
function countRepetitions(board) {
  const key = boardToString(board);
  let count = 0;
  for (const past of boardHistory) {
    if (past === key) count++;
  }
  return count;
}

// ─── BOARD EVALUATION ─────────────────────────────────────────

function evaluateBoard(board) {
  let score = 0;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece !== "") {
        score += PIECE_VALUES[piece] || 0;
      }
    }
  }
  return score;
}

// ─── GET ALL MOVES FOR ONE SIDE ───────────────────────────────

function getAllMoves(board, color) {
  const moves = [];
  const mine = color === "white"
    ? ["♙","♖","♘","♗","♕","♔"]
    : ["♟","♜","♞","♝","♛","♚"];

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (mine.includes(board[row][col])) {
        const saved = currentTurn;
        currentTurn = color;
        const targets = getLegalMoves(row, col);
        currentTurn = saved;

        for (const t of targets) {
          moves.push({ fromRow: row, fromCol: col, toRow: t.row, toCol: t.col });
        }
      }
    }
  }
  return moves;
}

// ─── APPLY A MOVE TO A COPY OF THE BOARD ─────────────────────

function applyMove(board, move) {
  const copy = board.map(row => [...row]);
  copy[move.toRow][move.toCol] = copy[move.fromRow][move.fromCol];
  copy[move.fromRow][move.fromCol] = "";
  return copy;
}

// ─── MINIMAX WITH ALPHA-BETA PRUNING ─────────────────────────

function minimax(board, depth, alpha, beta, isMaximizing) {
  if (depth === 0) {
    return evaluateBoard(board);
  }

  if (isMaximizing) {
    let best = -Infinity;
    const moves = getAllMoves(board, "white");

    for (const move of moves) {
      const newBoard = applyMove(board, move);
      const score = minimax(newBoard, depth - 1, alpha, beta, false);
      best = Math.max(best, score);
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break;
    }
    return best;

  } else {
    let best = Infinity;
    const moves = getAllMoves(board, "black");

    for (const move of moves) {
      const newBoard = applyMove(board, move);
      const score = minimax(newBoard, depth - 1, alpha, beta, true);
      best = Math.min(best, score);
      beta = Math.min(beta, score);
      if (beta <= alpha) break;
    }
    return best;
  }
}

// ─── FIND BEST MOVE FOR BLACK ─────────────────────────────────

// How much to penalise a move that repeats a past position.
// Higher number = AI avoids repetition more strongly.
const REPETITION_PENALTY = 0.5;

function getBestMove(board) {
  const moves = getAllMoves(board, "black");

  let bestScore = Infinity;
  let bestMoves = []; // collect ALL moves that tie for best score

  for (const move of moves) {
    const newBoard = applyMove(board, move);

    // Run minimax to score this move
    let score = minimax(newBoard, 2, -Infinity, Infinity, true);

    // If this position has been seen before, make it less attractive.
    // Each past repetition adds a penalty (remember: black wants LOW scores,
    // so we ADD the penalty to make the score worse for black).
    const repeated = countRepetitions(newBoard);
    if (repeated > 0) {
      score += repeated * REPETITION_PENALTY;
    }

    // Collect the best move(s)
    if (score < bestScore) {
      bestScore = score;
      bestMoves = [move]; // new best — start a fresh list
    } else if (score === bestScore) {
      bestMoves.push(move); // tied — add to the list
    }
  }

  // Pick randomly from all equally good moves.
  // This stops the AI always doing the same thing when moves tie.
  const chosen = bestMoves[Math.floor(Math.random() * bestMoves.length)];
  return chosen;
}