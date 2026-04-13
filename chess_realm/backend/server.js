require("dotenv").config();

const express  = require("express");
const mongoose = require("mongoose");
const bcrypt   = require("bcrypt");
const cors     = require("cors");
const path     = require("path");

// Import models from the models folder
const User = require("./models/User");
const Game = require("./models/Game");

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── MIDDLEWARE ───────────────────────────────────────────────

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));
console.log("Serving frontend from:", path.join(__dirname, "../frontend"));

// ─── DATABASE CONNECTION ──────────────────────────────────────
// mongoose.connect opens a connection to MongoDB.
// The URL tells it where MongoDB is running and which
// database to use (chessrealm is created automatically).

mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.log("MongoDB connection error:", err));

// ─── REGISTER ─────────────────────────────────────────────────

app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password required" });
  }

  // Basic password length check
  if (password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }

  try {
    // Hash the password with bcrypt before saving
    // The number 10 is the "salt rounds" — higher is safer but slower
    // 10 is a good balance for a student project
    const hashed = await bcrypt.hash(password, 10);

    const user = new User({ username, password: hashed });
    await user.save();

    res.json({ message: "Registered successfully" });
  } catch (err) {
    res.status(400).json({ message: "Username already taken" });
  }
});

// ─── LOGIN ────────────────────────────────────────────────────

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password required" });
  }

  try {
    // Look up the user in the database by username
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // bcrypt.compare checks the plain password against the stored hash
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ message: "Wrong password" });
    }

    // Send back the username so the frontend can remember who is logged in
    res.json({ message: "Login successful", username });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ─── SAVE GAME ────────────────────────────────────────────────

app.post("/api/game", async (req, res) => {
  const { username, result, moves } = req.body;

  if (!username || !result) {
    return res.status(400).json({ message: "Username and result required" });
  }

  try {
    // Save the completed game with move history
    const game = new Game({
      username,
      result,
      moves: moves || [], // moves is optional — empty array if not provided
    });
    await game.save();

    res.json({ message: "Game saved" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ─── GET GAME HISTORY ─────────────────────────────────────────

app.get("/api/history/:username", async (req, res) => {
  try {
    // Find all games for this user, newest first
    const games = await Game.find({ username: req.params.username })
      .sort({ playedAt: -1 })
      .select("result moves playedAt"); // only return these fields

    res.json(games);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ─── AI MOVE (placeholder) ────────────────────────────────────

app.post("/api/ai-move", (req, res) => {
  res.json({ message: "AI runs in the browser via ai.js" });
});

// ─── CATCH-ALL ────────────────────────────────────────────────

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// ─── START ────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
