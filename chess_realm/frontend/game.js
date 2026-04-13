const canvas = document.getElementById("chessBoard");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");

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

// ─── RESIGN ──────────────────────────────────────────────────

function resignGame() {
  statusEl.textContent = "You resigned. Game over.";
  currentTurn = "over";
}

// ─── PIECE HELPERS ───────────────────────────────────────────

const whitePieces = ["♙","♖","♘","♗","♕","♔"];
const blackPieces = ["♟","♜","♞","♝","♛","♚"];

function isWhite(p) { return whitePieces.includes(p); }
function isBlack(p) { return blackPieces.includes(p); }
function isEmpty(p) { return p === ""; }

function isMine(p) {
  return currentTurn === "white" ? isWhite(p) : isBlack(p);
}
function isOpponent(p) {
  return currentTurn === "white" ? isBlack(p) : isWhite(p);
}

function inBounds(r, c) {
  return r >= 0 && r <= 7 && c >= 0 && c <= 7;
}

// ─── RAW MOVES (no check filtering) ──────────────────────────
// These are the moves a piece can physically make,
// before we check whether they leave the king in check.
// We need a separate raw version to avoid infinite loops
// when checking if the king is safe.

function getRawMoves(board, row, col, color) {
  const piece = board[row][col];
  const moves = [];

  const myColor   = color;
  const oppColor  = color === "white" ? "black" : "white";

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
  }

  return moves;
}

// ─── CHECK DETECTION ─────────────────────────────────────────
// Returns true if the given color's king is under attack.

function isInCheck(board, color) {
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

  // Check if any opponent piece can reach the king
  const opponent = color === "white" ? "black" : "white";
  const oppPieces = opponent === "white" ? whitePieces : blackPieces;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (oppPieces.includes(board[r][c])) {
        const attacks = getRawMoves(board, r, c, opponent);
        for (const a of attacks) {
          if (a.row === kingRow && a.col === kingCol) {
            return true; // king is under attack
          }
        }
      }
    }
  }

  return false;
}

// ─── LEGAL MOVES (with check filtering) ──────────────────────
// Same as raw moves, but removes any move that would leave
// our own king in check.

function getLegalMoves(row, col) {
  const color = currentTurn;
  const rawMoves = getRawMoves(board, row, col, color);
  const safe = [];

  for (const move of rawMoves) {
    // Try the move on a copy of the board
    const copy = board.map(r => [...r]);
    copy[move.row][move.col] = copy[row][col];
    copy[row][col] = "";

    // Only keep the move if our king is not in check after it
    if (!isInCheck(copy, color)) {
      safe.push(move);
    }
  }

  return safe;
}

// ─── ALL LEGAL MOVES FOR ONE SIDE ────────────────────────────
// Used to detect checkmate and stalemate.

function getAllLegalMoves(board, color) {
  const pieces = color === "white" ? whitePieces : blackPieces;
  const moves = [];
  const saved = currentTurn;
  currentTurn = color;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (pieces.includes(board[r][c])) {
        const pieceMoves = getLegalMoves(r, c);
        for (const m of pieceMoves) {
          moves.push({ fromRow: r, fromCol: c, toRow: m.row, toCol: m.col });
        }
      }
    }
  }

  currentTurn = saved;
  return moves;
}

// ─── GAME OVER CHECK ─────────────────────────────────────────
// Call this after each move to see if the game has ended.
// Returns "checkmate", "stalemate", or null.

function getGameOverState(color) {
  const moves = getAllLegalMoves(board, color);

  if (moves.length === 0) {
    if (isInCheck(board, color)) {
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
  board[toRow][toCol] = board[fromRow][fromCol];
  board[fromRow][fromCol] = "";
  lastMove = { row: toRow, col: toCol };

  recordBoard(board);

  // Switch turns
  currentTurn = currentTurn === "white" ? "black" : "white";

  // Check if the other side is now in checkmate or stalemate
  const state = getGameOverState(currentTurn);

  if (state === "checkmate") {
    const winner = currentTurn === "white" ? "Black wins!" : "White wins!";
    statusEl.textContent = "Checkmate! " + winner;
    currentTurn = "over";
    drawBoard();
    return;
  }

  if (state === "stalemate") {
    statusEl.textContent = "Stalemate! It's a draw.";
    currentTurn = "over";
    drawBoard();
    return;
  }

  // Warn if the current player is in check
  if (isInCheck(board, currentTurn)) {
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

// ─── START ───────────────────────────────────────────────────
drawBoard();