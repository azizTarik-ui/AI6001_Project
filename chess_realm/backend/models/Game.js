const mongoose = require("mongoose");

// This is the blueprint for a saved game in the database.
// Each game stores who played, the result, and every move made.

const gameSchema = new mongoose.Schema({

  username: {
    type:     String,
    required: true, // which user played this game
  },

  result: {
    type:     String,
    required: true,
    enum:     ["win", "loss", "draw"], // only these 3 values allowed
  },

  // Move history — a list of moves made during the game
  // Each move stores the from square and the to square
  // Example: { from: "e2", to: "e4" }
  moves: [
    {
      from: { type: String },
      to:   { type: String },
    }
  ],

  playedAt: {
    type:    Date,
    default: Date.now, // automatically set when game is saved
  },

});

// Export the model so server.js can use it
module.exports = mongoose.model("Game", gameSchema);