const canvas = document.getElementById("chessBoard");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");

const SQUARE_SIZE = 60;
const LIGHT = "#f0d9b5";
const DARK  = "#b58863";
const HIGHLIGHT = "#aef359";  // selected square
const MOVED_TO  = "#59aef3";  // where piece just landed

// The board — row 0 is top (black side), row 7 is bottom (white side)
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

// Whose turn is it? "white" or "black"
let currentTurn = "white";

// Which square is selected right now?
let selectedSquare = null;

// Last move — used to show a blue highlight
let lastMove = null;

// --- HELPERS ---

// White pieces are these symbols
const whitePieces = ["♙","♖","♘","♗","♕","♔"];
const blackPieces = ["♟","♜","♞","♝","♛","♚"];

function isWhite(piece) {
  return whitePieces.includes(piece);
}

function isBlack(piece) {
  return blackPieces.includes(piece);
}

function isCurrentPlayerPiece(piece) {
  if (currentTurn === "white") return isWhite(piece);
  if (currentTurn === "black") return isBlack(piece);
  return false;
}

function isOpponentPiece(piece) {
  if (currentTurn === "white") return isBlack(piece);
  if (currentTurn === "black") return isWhite(piece);
  return false;
}

// --- DRAW ---

function drawBoard() {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {

      // Default square color
      const isLight = (row + col) % 2 === 0;
      let color = isLight ? LIGHT : DARK;

      // Highlight selected square
      if (selectedSquare &&
          selectedSquare.row === row &&
          selectedSquare.col === col) {
        color = HIGHLIGHT;
      }

      // Highlight last move destination
      if (lastMove &&
          lastMove.row === row &&
          lastMove.col === col) {
        color = MOVED_TO;
      }

      // Draw square
      ctx.fillStyle = color;
      ctx.fillRect(
        col * SQUARE_SIZE,
        row * SQUARE_SIZE,
        SQUARE_SIZE,
        SQUARE_SIZE
      );

      // Draw piece
      const piece = board[row][col];
      if (piece !== "") {
        ctx.fillStyle = "black";
        ctx.font = "40px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          piece,
          col * SQUARE_SIZE + SQUARE_SIZE / 2,
          row * SQUARE_SIZE + SQUARE_SIZE / 2
        );
      }
    }
  }
}

// --- MOVE LOGIC ---

// Check if a move is allowed (very basic rules only)
function isMoveAllowed(fromRow, fromCol, toRow, toCol) {
  const target = board[toRow][toCol];

  // Rule 1: Cannot move to a square your own piece is on
  if (isCurrentPlayerPiece(target)) {
    return false;
  }

  // Rule 2: Must actually move somewhere
  if (fromRow === toRow && fromCol === toCol) {
    return false;
  }

  // All other moves allowed for now
  // (We will add piece-specific rules in the next step)
  return true;
}

// Move a piece from one square to another
function movePiece(fromRow, fromCol, toRow, toCol) {
  board[toRow][toCol] = board[fromRow][fromCol];
  board[fromRow][fromCol] = "";

  // Remember where we just moved to (for blue highlight)
  lastMove = { row: toRow, col: toCol };

  // Switch turns
  currentTurn = currentTurn === "white" ? "black" : "white";

  // Update the status text
  statusEl.textContent = currentTurn === "white"
    ? "Your turn (White)"
    : "AI thinking... (Black)";
}

// --- CLICK HANDLER ---

canvas.addEventListener("click", function (event) {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  const col = Math.floor(x / SQUARE_SIZE);
  const row = Math.floor(y / SQUARE_SIZE);

  const clickedPiece = board[row][col];

  // --- First click: select a piece ---
  if (selectedSquare === null) {
    // Only allow selecting your own pieces
    if (!isCurrentPlayerPiece(clickedPiece)) {
      return; // ignore click
    }
    selectedSquare = { row, col };
    drawBoard();
    return;
  }

  // --- Second click: move or reselect ---

  // If clicked the same square, deselect
  if (selectedSquare.row === row && selectedSquare.col === col) {
    selectedSquare = null;
    drawBoard();
    return;
  }

  // If clicked another one of your own pieces, switch selection
  if (isCurrentPlayerPiece(clickedPiece)) {
    selectedSquare = { row, col };
    drawBoard();
    return;
  }

  // Try to move
  if (isMoveAllowed(selectedSquare.row, selectedSquare.col, row, col)) {
    movePiece(selectedSquare.row, selectedSquare.col, row, col);
    selectedSquare = null;
    drawBoard();
  } else {
    // Move not allowed — flash a message
    statusEl.textContent = "Invalid move! Try again.";
    selectedSquare = null;
    drawBoard();
  }
});

// --- START ---
drawBoard();