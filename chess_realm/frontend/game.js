const canvas = document.getElementById("chessBoard");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");

const SQUARE_SIZE = 60;
const LIGHT      = "#f0d9b5";
const DARK       = "#b58863";
const HIGHLIGHT  = "#aef359";
const MOVED_TO   = "#59aef3";
const LEGAL_DOT  = "#00000033"; // dark dot shown on legal squares

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

let currentTurn  = "white";
let selectedSquare = null;
let lastMove       = null;
let legalMoves     = []; // squares the selected piece can move to

// ─── PIECE HELPERS ───────────────────────────────────────────

const whitePieces = ["♙","♖","♘","♗","♕","♔"];
const blackPieces = ["♟","♜","♞","♝","♛","♚"];

function isWhite(p)  { return whitePieces.includes(p); }
function isBlack(p)  { return blackPieces.includes(p); }
function isEmpty(p)  { return p === ""; }

function isMine(p) {
  return currentTurn === "white" ? isWhite(p) : isBlack(p);
}
function isOpponent(p) {
  return currentTurn === "white" ? isBlack(p) : isWhite(p);
}

function inBounds(r, c) {
  return r >= 0 && r <= 7 && c >= 0 && c <= 7;
}

// ─── LEGAL MOVE CALCULATOR ───────────────────────────────────

// Returns an array of {row, col} squares a piece can move to.
function getLegalMoves(row, col) {
  const piece = board[row][col];
  const moves = [];

  // Sliding pieces (rook, bishop, queen) move along rays.
  // We keep going until we hit a wall, our own piece, or capture an opponent.
  function slide(directions) {
    for (const [dr, dc] of directions) {
      let r = row + dr;
      let c = col + dc;
      while (inBounds(r, c)) {
        if (isEmpty(board[r][c])) {
          moves.push({ row: r, col: c });
        } else if (isOpponent(board[r][c])) {
          moves.push({ row: r, col: c }); // capture then stop
          break;
        } else {
          break; // blocked by own piece
        }
        r += dr;
        c += dc;
      }
    }
  }

  // Jumping pieces (knight, king) just check each target square once.
  function jump(targets) {
    for (const [dr, dc] of targets) {
      const r = row + dr;
      const c = col + dc;
      if (inBounds(r, c) && !isMine(board[r][c])) {
        moves.push({ row: r, col: c });
      }
    }
  }

  // ── PAWN ──
  if (piece === "♙") { // white pawn moves UP (row decreases)
    // One step forward
    if (inBounds(row-1, col) && isEmpty(board[row-1][col])) {
      moves.push({ row: row-1, col });
      // Two steps from starting row
      if (row === 6 && isEmpty(board[row-2][col])) {
        moves.push({ row: row-2, col });
      }
    }
    // Diagonal captures
    for (const dc of [-1, 1]) {
      if (inBounds(row-1, col+dc) && isBlack(board[row-1][col+dc])) {
        moves.push({ row: row-1, col: col+dc });
      }
    }
  }

  if (piece === "♟") { // black pawn moves DOWN (row increases)
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

  // ── ROOK ──
  if (piece === "♖" || piece === "♜") {
    slide([[1,0],[-1,0],[0,1],[0,-1]]);
  }

  // ── BISHOP ──
  if (piece === "♗" || piece === "♝") {
    slide([[1,1],[1,-1],[-1,1],[-1,-1]]);
  }

  // ── QUEEN ──
  if (piece === "♕" || piece === "♛") {
    slide([[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]);
  }

  // ── KNIGHT ──
  if (piece === "♘" || piece === "♞") {
    jump([[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]]);
  }

  // ── KING ──
  if (piece === "♔" || piece === "♚") {
    jump([[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]);
  }

  return moves;
}

// ─── DRAW ────────────────────────────────────────────────────

function drawBoard() {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {

      // Square color
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

      // Draw piece
      const piece = board[row][col];
      if (piece !== "") {
        ctx.fillStyle = "black";
        ctx.font = "40px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(piece,
          col*SQUARE_SIZE + SQUARE_SIZE/2,
          row*SQUARE_SIZE + SQUARE_SIZE/2
        );
      }
    }
  }

  // Draw dots on legal move squares
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
  currentTurn = currentTurn === "white" ? "black" : "white";
  statusEl.textContent = currentTurn === "white"
    ? "Your turn (White)"
    : "Black's turn";
}

// ─── CLICK ───────────────────────────────────────────────────

canvas.addEventListener("click", function(event) {
  const rect = canvas.getBoundingClientRect();
  const col  = Math.floor((event.clientX - rect.left) / SQUARE_SIZE);
  const row  = Math.floor((event.clientY - rect.top)  / SQUARE_SIZE);
  const clickedPiece = board[row][col];

  // Nothing selected yet — try to select a piece
  if (selectedSquare === null) {
    if (!isMine(clickedPiece)) return;
    selectedSquare = { row, col };
    legalMoves = getLegalMoves(row, col);
    drawBoard();
    return;
  }

  // Clicked the same square — deselect
  if (selectedSquare.row === row && selectedSquare.col === col) {
    selectedSquare = null;
    legalMoves = [];
    drawBoard();
    return;
  }

  // Clicked another one of your own pieces — switch selection
  if (isMine(clickedPiece)) {
    selectedSquare = { row, col };
    legalMoves = getLegalMoves(row, col);
    drawBoard();
    return;
  }

  // Check if destination is a legal move
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