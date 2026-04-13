const canvas    = document.getElementById("chessBoard");
const ctx       = canvas.getContext("2d");
const statusEl  = document.getElementById("status");
const movesEl   = document.getElementById("moves");

const SQUARE_SIZE = 60;

// ── Colors ──────────────────────────────────────────────────
const LIGHT      = "#f0d9b5";
const DARK       = "#b58863";
const HL_SELECT  = "#f6f669cc";   // selected square — yellow
const HL_MOVE    = "#cdd16e99";   // last-moved square — soft green
const HL_LEGAL   = "#00000030";   // legal-move dot fill
const HL_CAPTURE = "#ff000040";   // capture target tint

// ── Board state ─────────────────────────────────────────────
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
let moveCount      = 0;      // full move counter (increments after black moves)
let whiteMoveNum   = 0;      // move number shown in move list

// ── Piece sets ───────────────────────────────────────────────
const whitePieces = ["♙","♖","♘","♗","♕","♔"];
const blackPieces = ["♟","♜","♞","♝","♛","♚"];

function isWhite(p)    { return whitePieces.includes(p); }
function isBlack(p)    { return blackPieces.includes(p); }
function isEmpty(p)    { return p === ""; }
function isMine(p)     { return currentTurn === "white" ? isWhite(p) : isBlack(p); }
function isOpponent(p) { return currentTurn === "white" ? isBlack(p) : isWhite(p); }
function inBounds(r,c) { return r>=0 && r<=7 && c>=0 && c<=7; }

// ── Piece names for move list ────────────────────────────────
const pieceNames = {
  "♙":"P","♖":"R","♘":"N","♗":"B","♕":"Q","♔":"K",
  "♟":"p","♜":"r","♞":"n","♝":"b","♛":"q","♚":"k"
};
const files = ["a","b","c","d","e","f","g","h"];
function squareName(r,c) { return files[c] + (8 - r); }

// ── Sound (Web Audio API — no file needed) ───────────────────
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playMove() {
  // Soft wooden "thud"
  const buf  = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.12, audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    // Decaying noise — sounds like a piece being placed
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 6);
  }
  const src  = audioCtx.createBufferSource();
  const gain = audioCtx.createGain();
  src.buffer = buf;
  gain.gain.setValueAtTime(0.35, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
  src.connect(gain);
  gain.connect(audioCtx.destination);
  src.start();
}

function playCapture() {
  // Two-layer crack — louder and sharper
  [0, 0.04].forEach(delay => {
    const buf  = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.15, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 4);
    }
    const src  = audioCtx.createBufferSource();
    const gain = audioCtx.createGain();
    src.buffer = buf;
    gain.gain.setValueAtTime(0.6, audioCtx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + delay + 0.15);
    src.connect(gain);
    gain.connect(audioCtx.destination);
    src.start(audioCtx.currentTime + delay);
  });
}

// ── Legal moves ──────────────────────────────────────────────
function getLegalMoves(row, col) {
  const piece = board[row][col];
  const moves = [];

  function slide(dirs) {
    for (const [dr,dc] of dirs) {
      let r = row+dr, c = col+dc;
      while (inBounds(r,c)) {
        if (isEmpty(board[r][c]))           { moves.push({row:r,col:c}); }
        else if (isOpponent(board[r][c]))   { moves.push({row:r,col:c}); break; }
        else                                { break; }
        r+=dr; c+=dc;
      }
    }
  }

  function jump(targets) {
    for (const [dr,dc] of targets) {
      const r=row+dr, c=col+dc;
      if (inBounds(r,c) && !isMine(board[r][c])) moves.push({row:r,col:c});
    }
  }

  if (piece === "♙") {
    if (inBounds(row-1,col) && isEmpty(board[row-1][col])) {
      moves.push({row:row-1,col});
      if (row===6 && isEmpty(board[row-2][col])) moves.push({row:row-2,col});
    }
    for (const dc of [-1,1])
      if (inBounds(row-1,col+dc) && isBlack(board[row-1][col+dc]))
        moves.push({row:row-1,col:col+dc});
  }
  if (piece === "♟") {
    if (inBounds(row+1,col) && isEmpty(board[row+1][col])) {
      moves.push({row:row+1,col});
      if (row===1 && isEmpty(board[row+2][col])) moves.push({row:row+2,col});
    }
    for (const dc of [-1,1])
      if (inBounds(row+1,col+dc) && isWhite(board[row+1][col+dc]))
        moves.push({row:row+1,col:col+dc});
  }

  if (piece==="♖"||piece==="♜") slide([[1,0],[-1,0],[0,1],[0,-1]]);
  if (piece==="♗"||piece==="♝") slide([[1,1],[1,-1],[-1,1],[-1,-1]]);
  if (piece==="♕"||piece==="♛") slide([[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]);
  if (piece==="♘"||piece==="♞") jump([[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]]);
  if (piece==="♔"||piece==="♚") jump([[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]);

  return moves;
}

// ── Draw ─────────────────────────────────────────────────────
function drawBoard() {
  for (let row=0; row<8; row++) {
    for (let col=0; col<8; col++) {
      const x = col * SQUARE_SIZE;
      const y = row * SQUARE_SIZE;

      // Base square
      ctx.fillStyle = (row+col)%2===0 ? LIGHT : DARK;
      ctx.fillRect(x, y, SQUARE_SIZE, SQUARE_SIZE);

      // Last-move highlight
      if (lastMove && lastMove.to.row===row && lastMove.to.col===col) {
        ctx.fillStyle = HL_MOVE;
        ctx.fillRect(x, y, SQUARE_SIZE, SQUARE_SIZE);
      }
      if (lastMove && lastMove.from.row===row && lastMove.from.col===col) {
        ctx.fillStyle = HL_MOVE;
        ctx.fillRect(x, y, SQUARE_SIZE, SQUARE_SIZE);
      }

      // Selected square
      if (selectedSquare && selectedSquare.row===row && selectedSquare.col===col) {
        ctx.fillStyle = HL_SELECT;
        ctx.fillRect(x, y, SQUARE_SIZE, SQUARE_SIZE);
      }

      // Draw piece
      const piece = board[row][col];
      if (piece) {
        // Shadow
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur  = 4;
        ctx.shadowOffsetY = 2;

        ctx.font = "44px serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#000";
        ctx.fillText(piece, x + SQUARE_SIZE/2, y + SQUARE_SIZE/2 + 2);

        ctx.shadowColor = "transparent";
        ctx.shadowBlur  = 0;
        ctx.shadowOffsetY = 0;
      }
    }
  }

  // Legal move dots / capture rings (drawn on top)
  for (const m of legalMoves) {
    const x = m.col * SQUARE_SIZE;
    const y = m.row * SQUARE_SIZE;
    const cx = x + SQUARE_SIZE/2;
    const cy = y + SQUARE_SIZE/2;

    if (!isEmpty(board[m.row][m.col])) {
      // Capture: draw a ring around the square
      ctx.strokeStyle = HL_CAPTURE;
      ctx.lineWidth   = 5;
      ctx.strokeRect(x+3, y+3, SQUARE_SIZE-6, SQUARE_SIZE-6);
    } else {
      // Empty: draw a small dark dot
      ctx.fillStyle = HL_LEGAL;
      ctx.beginPath();
      ctx.arc(cx, cy, 11, 0, Math.PI*2);
      ctx.fill();
    }
  }
}

// ── Move list ────────────────────────────────────────────────
let pendingWhiteMove = null;   // store white's notation until black moves

function recordMove(fromRow, fromCol, toRow, toCol, isCapture) {
  const piece = board[fromRow][fromCol];
  const notation = pieceNames[piece] + squareName(toRow, toCol) +
                   (isCapture ? "x" : "");

  if (currentTurn === "white") {
    whiteMoveNum++;
    pendingWhiteMove = { num: whiteMoveNum, text: notation };
  } else {
    // Black just moved — append to white's entry
    const entry = document.createElement("div");
    entry.className = "move-entry";
    const num   = pendingWhiteMove ? pendingWhiteMove.num : whiteMoveNum;
    const white = pendingWhiteMove ? pendingWhiteMove.text : "...";
    entry.innerHTML =
      `<span class="move-num">${num}.</span>
       <span class="move-text">${white}</span>
       <span class="move-text" style="color:#8880a0">${notation}</span>`;
    // Remove placeholder text
    if (movesEl.querySelector("span[style]")) movesEl.innerHTML = "";
    movesEl.appendChild(entry);
    movesEl.scrollTop = movesEl.scrollHeight;
    pendingWhiteMove = null;
  }
}

// ── Execute move ─────────────────────────────────────────────
function movePiece(fromRow, fromCol, toRow, toCol) {
  const isCapture = !isEmpty(board[toRow][toCol]);

  recordMove(fromRow, fromCol, toRow, toCol, isCapture);

  board[toRow][toCol] = board[fromRow][fromCol];
  board[fromRow][fromCol] = "";

  lastMove = { from:{row:fromRow,col:fromCol}, to:{row:toRow,col:toCol} };

  if (isCapture) playCapture();
  else           playMove();

  currentTurn = currentTurn === "white" ? "black" : "white";

  const dot = `<span class="turn-dot"></span>`;
  statusEl.innerHTML = currentTurn === "white"
    ? dot + "Your turn (White)"
    : dot + "Black's turn";
}

// ── Click handler ────────────────────────────────────────────
canvas.addEventListener("click", function(e) {
  // Resume audio context on first interaction (browser rule)
  if (audioCtx.state === "suspended") audioCtx.resume();

  const rect = canvas.getBoundingClientRect();
  const col  = Math.floor((e.clientX - rect.left)  / SQUARE_SIZE);
  const row  = Math.floor((e.clientY - rect.top)   / SQUARE_SIZE);
  const clickedPiece = board[row][col];

  if (selectedSquare === null) {
    if (!isMine(clickedPiece)) return;
    selectedSquare = {row,col};
    legalMoves = getLegalMoves(row,col);
    drawBoard();
    return;
  }

  if (selectedSquare.row===row && selectedSquare.col===col) {
    selectedSquare = null; legalMoves = []; drawBoard(); return;
  }

  if (isMine(clickedPiece)) {
    selectedSquare = {row,col};
    legalMoves = getLegalMoves(row,col);
    drawBoard(); return;
  }

  const isLegal = legalMoves.some(m => m.row===row && m.col===col);
  if (isLegal) {
    movePiece(selectedSquare.row, selectedSquare.col, row, col);
    selectedSquare = null; legalMoves = []; drawBoard();
  } else {
    const dot = `<span class="turn-dot"></span>`;
    statusEl.innerHTML = dot + "Invalid move — try again";
    selectedSquare = null; legalMoves = []; drawBoard();
  }
});

// ── Start ────────────────────────────────────────────────────
drawBoard();