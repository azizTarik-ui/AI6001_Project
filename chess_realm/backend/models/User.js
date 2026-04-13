const mongoose = require("mongoose");

// This is the blueprint for a user in the database.
// Every user has a username, a hashed password, and a join date.

const userSchema = new mongoose.Schema({

  username: {
    type:     String,
    required: true,   // must be provided
    unique:   true,   // no two users can have the same username
    trim:     true,   // removes accidental spaces
    minlength: 3,     // at least 3 characters
    maxlength: 30,    // no more than 30 characters
  },

  password: {
    type:     String,
    required: true,
    // We store a hashed version, never the real password
  },

  joinedAt: {
    type:    Date,
    default: Date.now, // automatically set when user registers
  },

});

// Export the model so server.js can use it
module.exports = mongoose.model("User", userSchema);