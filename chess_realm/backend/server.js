// Load environment variables from .env file
require("dotenv").config();

const express  = require("express");
const mongoose = require("mongoose");
const bcrypt   = require("bcrypt");
const cors     = require("cors");
const path     = require("path");

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── MIDDLEWARE ───────────────────────────────────────────────
// These lines tell Express how to handle incoming requests.

app.use(cors());                           // allow frontend to talk to backend
app.use(express.json());                   // allow reading JSON from requests
app.use(express.static(path.join(__dirname, "../frontend"))); // serve frontend files

// ─── DATABASE CONNECTION ──────────────────────────────────────

mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.log("MongoDB error:", err));

// ─── DATABASE MODELS ──────────────────────────────────────────
// A model is just a blueprint for what we store in the database.

// User: stores username and hashed password
const User = mongoose.model("User", new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
}));

// Game: stores the result of one finished game
const Game = mongoose.model("Game", new mongoose.Schema({
  username: { type: String, required: true },
  result:   { type: String, required: true }, // "win", "loss", or "draw"
  date:     { type: Date,   default: Date.now },
}));

// ─── ROUTES ───────────────────────────────────────────────────

// REGISTER
// Receives: { username, password }
// Saves a new user with a hashed password
app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password required" });
  }

  try {
    // Hash the password before saving (never store plain passwords)
    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashed });
    await user.save();
    res.json({ message: "Registered successfully" });
  } catch (err) {
    // Most likely error: username already taken
    res.status(400).json({ message: "Username already taken" });
  }
});

// LOGIN
// Receives: { username, password }
// Checks if the user exists and password is correct
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password required" });
  }

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Compare the entered password with the stored hashed password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ message: "Wrong password" });
    }

    res.json({ message: "Login successful", username });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// SAVE GAME
// Receives: { username, result }
// Saves the result of a finished game
app.post("/api/game", async (req, res) => {
  const { username, result } = req.body;

  if (!username || !result) {
    return res.status(400).json({ message: "Username and result required" });
  }

  try {
    const game = new Game({ username, result });
    await game.save();
    res.json({ message: "Game saved" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// GET GAME HISTORY
// Receives: username as a URL parameter
// Returns all games played by that user
app.get("/api/history/:username", async (req, res) => {
  try {
    const games = await Game.find({ username: req.params.username })
      .sort({ date: -1 }); // newest first
    res.json(games);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// AI MOVE
// Receives: { board, currentTurn }
// This is a placeholder — the real AI lives in ai.js on the frontend.
// This route exists in case you want to move the AI to the server later.
app.post("/api/ai-move", (req, res) => {
  const { board } = req.body;

  if (!board) {
    return res.status(400).json({ message: "Board is required" });
  }

  // Pick a random move — server-side AI placeholder
  // Your real AI already works in the browser via ai.js
  res.json({ message: "AI runs in the browser for now" });
});

// CATCH-ALL: serve index.html for any unknown route
// This means typing any URL still loads your frontend
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// ─── START SERVER ─────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});