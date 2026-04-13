// Get the canvas element from the HTML page
const canvas = document.getElementById("chessBoard");
const ctx = canvas.getContext("2d");

// Each square is 60x60 pixels (480 / 8 = 60)
const SQUARE_SIZE = 60;

// Colors for the board squares
const LIGHT = "#f0d9b5";
const DARK  = "#b58863";
const HIGHLIGHT = "#00ff00";

// This stores which square the player clicked
// null means nothing is selected yet
let selectedSquare = null;

// The starting positions of all pieces
// Each piece is a text symbol
// Empty squares are ""
const board = [
  ["♜","♞","♝","♛","♚","♝","♞","♜"],  // row 0 - black back row
  ["♟","♟","♟","♟","♟","♟","♟","♟"],  // row 1 - black pawns
  ["","","","","","","",""],             // row 2 - empty
  ["","","","","","","",""],             // row 3 - empty
  ["","","","","","","",""],             // row 4 - empty
  ["","","","","","","",""],             // row 5 - empty
  ["♙","♙","♙","♙","♙","♙","♙","♙"],  // row 6 - white pawns
  ["♖","♘","♗","♕","♔","♗","♘","♖"],  // row 7 - white back row
];

// --- DRAW THE BOARD ---
function drawBoard() {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {

      // Decide square color
      const isLight = (row + col) % 2 === 0;
      let color = isLight ? LIGHT : DARK;

      // If this square is selected, color it green
      if (
        selectedSquare &&
        selectedSquare.row === row &&
        selectedSquare.col === col
      ) {
        color = HIGHLIGHT;
      }

      // Draw the square
      ctx.fillStyle = color;
      ctx.fillRect(
        col * SQUARE_SIZE,
        row * SQUARE_SIZE,
        SQUARE_SIZE,
        SQUARE_SIZE
      );

      // Draw the piece symbol if there is one
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

// --- HANDLE CLICKS ---
canvas.addEventListener("click", function (event) {
  // Find which square was clicked
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  const col = Math.floor(x / SQUARE_SIZE);
  const row = Math.floor(y / SQUARE_SIZE);

  // Save the selected square
  selectedSquare = { row, col };

  // Redraw the board to show the highlight
  drawBoard();
});

// --- START ---
// Draw the board when the page first loads
drawBoard();