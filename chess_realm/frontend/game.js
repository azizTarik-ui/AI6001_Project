const canvas = document.getElementById("chessBoard");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");
const resignBtn = document.getElementById("resignBtn");
const gameOverPanel = document.getElementById("gameOverPanel");
const gameOverMessageEl = document.getElementById("gameOverMessage");
const playAgainBtn = document.getElementById("playAgainBtn");

const SQUARE_SIZE = 60;
const LIGHT      = "#f0d9b5";
const DARK       = "#b58863";
const HIGHLIGHT  = "#aef359";
const MOVED_TO   = "#59aef3";
const LEGAL_DOT  = "#00000033";

let board = [
  ["♜","♞","♝","♛","♚","♝","♞","♜"],
  ["♟","♟","♟","♟","♟","♟","♟","♟"],
  ["","","","","","","",""],
  ["","","","","","","",""],
  ["","","","","","","",""],
  ["","","","","","","",""],
  ["♙","♙","♙","♙","♙","♙","♙","♙"],
  ["♖","♘","♗","♕","♔","♗","♘","♖"],
];

let currentTurn    = "white";
let selectedSquare = null;
let lastMove       = null;
let legalMoves     = [];
let audioContext   = null;
let moveHistory = []; // tracks all moves made this game
let castleRights = {
  white: { kingSide: true, queenSide: true },
  black: { kingSide: true, queenSide: true },
};

// ─── RESIGN ──────────────────────────────────────────────────

function resignGame() {
  showGameOver("Game Over: You resigned.", "loss");
}

function showGameOver(message, result) {
  statusEl.textContent = message;
  currentTurn = "over";
  selectedSquare = null;
  legalMoves = [];

  if (gameOverPanel && gameOverMessageEl) {
    gameOverMessageEl.textContent = message;
    gameOverPanel.classList.remove("hidden");
  }

  if (resignBtn) {
    resignBtn.disabled = true;
    resignBtn.textContent = "Game Over";
  }

  saveGame(result);
  drawBoard();
}

// ─── PIECE HELPERS ───────────────────────────────────────────

const whitePieces = ["♙","♖","♘","♗","♕","♔"];
const blackPieces = ["♟","♜","♞","♝","♛","♚"];

function isWhite(p) { return whitePieces.includes(p); }
function isBlack(p) { return blackPieces.includes(p); }
function isEmpty(p) { return p === ""; }

function isKing(p) {
  return p === "♔" || p === "♚";
}

function isRook(p) {
  return p === "♖" || p === "♜";
}

function getColorOfPiece(p) {
  if (isWhite(p)) return "white";
  if (isBlack(p)) return "black";
  return null;
}

function cloneCastleRights(rights) {
  return {
    white: { ...rights.white },
    black: { ...rights.black },
  };
}

function isCastleMove(piece, fromRow, fromCol, toRow, toCol) {
  return isKing(piece) && fromRow === toRow && Math.abs(toCol - fromCol) === 2;
}

function moveRookForCastle(boardState, color, toCol) {
  const row = color === "white" ? 7 : 0;
  if (toCol === 6) {
    boardState[row][5] = boardState[row][7];
    boardState[row][7] = "";
  } else if (toCol === 2) {
    boardState[row][3] = boardState[row][0];
    boardState[row][0] = "";
  }
}

function updateCastleRightsAfterMove(rights, boardState, fromRow, fromCol, toRow, toCol) {
  const nextRights = cloneCastleRights(rights);
  const movingPiece = boardState[fromRow][fromCol];
  const capturedPiece = boardState[toRow][toCol];
  const movingColor = getColorOfPiece(movingPiece);
  const capturedColor = getColorOfPiece(capturedPiece);

  if (movingColor) {
    if (isKing(movingPiece)) {
      nextRights[movingColor].kingSide = false;
      nextRights[movingColor].queenSide = false;
    }

    if (isRook(movingPiece)) {
      if (movingColor === "white" && fromRow === 7 && fromCol === 7) nextRights.white.kingSide = false;
      if (movingColor === "white" && fromRow === 7 && fromCol === 0) nextRights.white.queenSide = false;
      if (movingColor === "black" && fromRow === 0 && fromCol === 7) nextRights.black.kingSide = false;
      if (movingColor === "black" && fromRow === 0 && fromCol === 0) nextRights.black.queenSide = false;
    }
  }

  if (capturedColor && isRook(capturedPiece)) {
    if (capturedColor === "white" && toRow === 7 && toCol === 7) nextRights.white.kingSide = false;
    if (capturedColor === "white" && toRow === 7 && toCol === 0) nextRights.white.queenSide = false;
    if (capturedColor === "black" && toRow === 0 && toCol === 7) nextRights.black.kingSide = false;
    if (capturedColor === "black" && toRow === 0 && toCol === 0) nextRights.black.queenSide = false;
  }

  return nextRights;
}

function isMine(p) {
  return currentTurn === "white" ? isWhite(p) : isBlack(p);
}
function isOpponent(p) {
  return currentTurn === "white" ? isBlack(p) : isWhite(p);
}

function inBounds(r, c) {
  return r >= 0 && r <= 7 && c >= 0 && c <= 7;
}

function getAudioContext() {
  if (!audioContext) {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return null;
    audioContext = new AudioCtor();
  }
  return audioContext;
}

function playMoveSound(isCapture) {
  const context = getAudioContext();
  if (!context) return;

  if (context.state === "suspended") {
    context.resume();
  }

  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.type = isCapture ? "triangle" : "sine";
  oscillator.frequency.setValueAtTime(isCapture ? 280 : 220, now);
  oscillator.frequency.exponentialRampToValueAtTime(isCapture ? 180 : 140, now + 0.12);

  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(isCapture ? 0.12 : 0.08, now + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.18);
}

// ─── RAW MOVES (no check filtering) ──────────────────────────
// These are the moves a piece can physically make,
// before we check whether they leave the king in check.
// We need a separate raw version to avoid infinite loops
// when checking if the king is safe.

function getRawMoves(board, row, col, color, options = {}) {
  const piece = board[row][col];
  const moves = [];

  const myColor   = color;
  const oppColor  = color === "white" ? "black" : "white";
  const includeCastling = options.includeCastling !== false;
  const rights = options.castleRights || castleRights;

  function isMineRaw(p)  { return myColor  === "white" ? isWhite(p) : isBlack(p); }
  function isOppRaw(p)   { return oppColor === "white" ? isWhite(p) : isBlack(p); }

  function slide(directions) {
    for (const [dr, dc] of directions) {
      let r = row + dr;
      let c = col + dc;
      while (inBounds(r, c)) {
        if (isEmpty(board[r][c])) {
          moves.push({ row: r, col: c });
        } else if (isOppRaw(board[r][c])) {
          moves.push({ row: r, col: c });
          break;
        } else {
          break;
        }
        r += dr;
        c += dc;
      }
    }
  }

  function jump(targets) {
    for (const [dr, dc] of targets) {
      const r = row + dr;
      const c = col + dc;
      if (inBounds(r, c) && !isMineRaw(board[r][c])) {
        moves.push({ row: r, col: c });
      }
    }
  }

  if (piece === "♙") {
    if (inBounds(row-1, col) && isEmpty(board[row-1][col])) {
      moves.push({ row: row-1, col });
      if (row === 6 && isEmpty(board[row-2][col])) {
        moves.push({ row: row-2, col });
      }
    }
    for (const dc of [-1, 1]) {
      if (inBounds(row-1, col+dc) && isBlack(board[row-1][col+dc])) {
        moves.push({ row: row-1, col: col+dc });
      }
    }
  }

  if (piece === "♟") {
    if (inBounds(row+1, col) && isEmpty(board[row+1][col])) {
      moves.push({ row: row+1, col });
      if (row === 1 && isEmpty(board[row+2][col])) {
        moves.push({ row: row+2, col });
      }
    }
    for (const dc of [-1, 1]) {
      if (inBounds(row+1, col+dc) && isWhite(board[row+1][col+dc])) {
        moves.push({ row: row+1, col: col+dc });
      }
    }
  }

  if (piece === "♖" || piece === "♜") {
    slide([[1,0],[-1,0],[0,1],[0,-1]]);
  }
  if (piece === "♗" || piece === "♝") {
    slide([[1,1],[1,-1],[-1,1],[-1,-1]]);
  }
  if (piece === "♕" || piece === "♛") {
    slide([[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]);
  }
  if (piece === "♘" || piece === "♞") {
    jump([[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]]);
  }
  if (piece === "♔" || piece === "♚") {
    jump([[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]);

    if (includeCastling) {
      const kingSideTarget = canCastle(board, color, "kingSide", rights);
      const queenSideTarget = canCastle(board, color, "queenSide", rights);

      if (kingSideTarget !== false) {
        moves.push({ row, col: kingSideTarget });
      }

      if (queenSideTarget !== false) {
        moves.push({ row, col: queenSideTarget });
      }
    }
  }

  return moves;
}

// ─── CHECK DETECTION ─────────────────────────────────────────
// Returns true if the given color's king is under attack.

function isInCheck(board, color) {
  return isInCheckWithRights(board, color, castleRights);
}

function isInCheckWithRights(board, color, rights) {
  // Find the king
  const kingSymbol = color === "white" ? "♔" : "♚";
  let kingRow = -1, kingCol = -1;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] === kingSymbol) {
        kingRow = r;
        kingCol = c;
      }
    }
  }

  // If king not found (shouldn't happen), treat as check
  if (kingRow === -1) return true;

  const opponent = color === "white" ? "black" : "white";

  return isSquareAttacked(board, kingRow, kingCol, opponent, rights);
}

function isSquareAttacked(board, targetRow, targetCol, attackerColor, rights = castleRights) {
  const attackerPieces = attackerColor === "white" ? whitePieces : blackPieces;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (attackerPieces.includes(board[r][c])) {
        const attacks = getRawMoves(board, r, c, attackerColor, {
          includeCastling: false,
          castleRights: rights,
        });
        for (const a of attacks) {
          if (a.row === targetRow && a.col === targetCol) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

function canCastle(board, color, side, rights = castleRights) {
  const row = color === "white" ? 7 : 0;
  const kingCol = 4;
  const rookCol = side === "kingSide" ? 7 : 0;
  const targetCol = side === "kingSide" ? 6 : 2;
  const pathCols = side === "kingSide" ? [5, 6] : [1, 2, 3];
  const kingPathCols = side === "kingSide" ? [4, 5, 6] : [4, 3, 2];
  const kingPiece = color === "white" ? "♔" : "♚";
  const rookPiece = color === "white" ? "♖" : "♜";
  const opponent = color === "white" ? "black" : "white";

  if (!rights[color][side]) return false;
  if (board[row][kingCol] !== kingPiece || board[row][rookCol] !== rookPiece) return false;

  for (const col of pathCols) {
    if (!isEmpty(board[row][col])) return false;
  }

  for (const col of kingPathCols) {
    if (isSquareAttacked(board, row, col, opponent, rights)) {
      return false;
    }
  }

  return targetCol;
}

// ─── LEGAL MOVES (with check filtering) ──────────────────────
// Same as raw moves, but removes any move that would leave
// our own king in check.

function getLegalMoves(row, col) {
  return getLegalMovesForBoard(board, row, col, currentTurn, castleRights);
}

function getLegalMovesForBoard(boardState, row, col, color, rights = castleRights) {
  const rawMoves = getRawMoves(boardState, row, col, color, {
    includeCastling: true,
    castleRights: rights,
  });
  const safe = [];

  for (const move of rawMoves) {
    // Try the move on a copy of the board
    const copy = boardState.map(r => [...r]);
    const piece = copy[row][col];

    if (isCastleMove(piece, row, col, move.row, move.col)) {
      moveRookForCastle(copy, color, move.col);
    }

    copy[move.row][move.col] = piece;
    copy[row][col] = "";

    // Only keep the move if our king is not in check after it
    if (!isInCheckWithRights(copy, color, rights)) {
      safe.push(move);
    }
  }

  return safe;
}

// ─── ALL LEGAL MOVES FOR ONE SIDE ────────────────────────────
// Used to detect checkmate and stalemate.

function getAllLegalMoves(board, color) {
  return getAllLegalMovesForBoard(board, color, castleRights);
}

function getAllLegalMovesForBoard(boardState, color, rights = castleRights) {
  const pieces = color === "white" ? whitePieces : blackPieces;
  const moves = [];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (pieces.includes(boardState[r][c])) {
        const pieceMoves = getLegalMovesForBoard(boardState, r, c, color, rights);
        for (const m of pieceMoves) {
          moves.push({ fromRow: r, fromCol: c, toRow: m.row, toCol: m.col });
        }
      }
    }
  }

  return moves;
}

// ─── GAME OVER CHECK ─────────────────────────────────────────
// Call this after each move to see if the game has ended.
// Returns "checkmate", "stalemate", or null.

function getGameOverState(color) {
  return getGameOverStateForBoard(board, color, castleRights);
}

function getGameOverStateForBoard(boardState, color, rights = castleRights) {
  const moves = getAllLegalMovesForBoard(boardState, color, rights);

  if (moves.length === 0) {
    if (isInCheckWithRights(boardState, color, rights)) {
      return "checkmate";
    } else {
      return "stalemate";
    }
  }
  return null;
}

// ─── DRAW ────────────────────────────────────────────────────

function drawBoard() {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {

      let color = (row + col) % 2 === 0 ? LIGHT : DARK;

      if (selectedSquare &&
          selectedSquare.row === row &&
          selectedSquare.col === col) {
        color = HIGHLIGHT;
      }

      if (lastMove &&
          lastMove.row === row &&
          lastMove.col === col) {
        color = MOVED_TO;
      }

      ctx.fillStyle = color;
      ctx.fillRect(col*SQUARE_SIZE, row*SQUARE_SIZE, SQUARE_SIZE, SQUARE_SIZE);

      const piece = board[row][col];
      if (piece !== "") {
        ctx.fillStyle = "black";
        ctx.font = "40px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          piece,
          col*SQUARE_SIZE + SQUARE_SIZE/2,
          row*SQUARE_SIZE + SQUARE_SIZE/2
        );
      }
    }
  }

  for (const { row, col } of legalMoves) {
    ctx.fillStyle = LEGAL_DOT;
    ctx.beginPath();
    ctx.arc(
      col*SQUARE_SIZE + SQUARE_SIZE/2,
      row*SQUARE_SIZE + SQUARE_SIZE/2,
      12, 0, Math.PI*2
    );
    ctx.fill();
  }
}

// ─── MOVE ────────────────────────────────────────────────────

function movePiece(fromRow, fromCol, toRow, toCol) {
  const isCapture = board[toRow][toCol] !== "";
  const movingPiece = board[fromRow][fromCol];
  const castleMove = isCastleMove(movingPiece, fromRow, fromCol, toRow, toCol);

  castleRights = updateCastleRightsAfterMove(castleRights, board, fromRow, fromCol, toRow, toCol);

  if (castleMove) {
    moveRookForCastle(board, isWhite(movingPiece) ? "white" : "black", toCol);
  }

  board[toRow][toCol] = movingPiece;
  board[fromRow][fromCol] = "";
  lastMove = { row: toRow, col: toCol };
  playMoveSound(isCapture);

  moveHistory.push({ from: `${fromRow},${fromCol}`, to: `${toRow},${toCol}` });


  recordBoard(board);

  // Switch turns
  currentTurn = currentTurn === "white" ? "black" : "white";

  // Check if the other side is now in checkmate or stalemate
  const state = getGameOverStateForBoard(board, currentTurn, castleRights);

  if (state === "checkmate") {
    const playerLost = currentTurn === "white";
    const message = playerLost ? "Game Over: Checkmate. You lose." : "Checkmate! You win!";
    showGameOver(message, playerLost ? "loss" : "win");
    return;
  }

  if (state === "stalemate") {
    showGameOver("Game Over: Stalemate. It's a draw.", "draw");
    return;
  }

  // Warn if the current player is in check
  if (isInCheckWithRights(board, currentTurn, castleRights)) {
    statusEl.textContent = currentTurn === "white"
      ? "You are in check!"
      : "AI is in check!";
  }

  // Let the AI move if it is black's turn
  if (currentTurn === "black") {
    if (!statusEl.textContent.includes("check")) {
      statusEl.textContent = "AI is thinking...";
    }
    drawBoard();

    setTimeout(() => {
      const aiMove = getBestMove(board);
      if (aiMove) {
        movePiece(aiMove.fromRow, aiMove.fromCol, aiMove.toRow, aiMove.toCol);
      }
      drawBoard();
    }, 100);

  } else {
    if (!statusEl.textContent.includes("check")) {
      statusEl.textContent = "Your turn (White)";
    }
  }
}

// ─── CLICK ───────────────────────────────────────────────────

canvas.addEventListener("click", function(event) {
  if (currentTurn === "over" || currentTurn === "black") return;

  const rect = canvas.getBoundingClientRect();
  const col  = Math.floor((event.clientX - rect.left) / SQUARE_SIZE);
  const row  = Math.floor((event.clientY - rect.top)  / SQUARE_SIZE);
  const clickedPiece = board[row][col];

  if (selectedSquare === null) {
    if (!isMine(clickedPiece)) return;
    selectedSquare = { row, col };
    legalMoves = getLegalMoves(row, col);
    drawBoard();
    return;
  }

  if (selectedSquare.row === row && selectedSquare.col === col) {
    selectedSquare = null;
    legalMoves = [];
    drawBoard();
    return;
  }

  if (isMine(clickedPiece)) {
    selectedSquare = { row, col };
    legalMoves = getLegalMoves(row, col);
    drawBoard();
    return;
  }

  const isLegal = legalMoves.some(m => m.row === row && m.col === col);
  if (isLegal) {
    movePiece(selectedSquare.row, selectedSquare.col, row, col);
    selectedSquare = null;
    legalMoves = [];
    drawBoard();
  } else {
    statusEl.textContent = "Invalid move! Try again.";
    selectedSquare = null;
    legalMoves = [];
    drawBoard();
  }
});

// ─── SAVE GAME TO BACKEND ─────────────────────────────────────

// Call this when the game ends (checkmate, stalemate, or resign)
async function saveGame(result) {
  const username = localStorage.getItem("username");
  if (!username) return; // not logged in, skip saving

  try {
    await fetch("/api/game", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ username, result, moves: moveHistory }),
    });
  } catch (err) {
    console.log("Could not save game:", err);
  }
}

// ─── START ───────────────────────────────────────────────────
drawBoard();

if (resignBtn) {
  resignBtn.addEventListener("click", resignGame);
}

if (playAgainBtn) {
  playAgainBtn.addEventListener("click", () => {
    window.location.reload();
  });
}