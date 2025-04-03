const mongoose = require("mongoose");


const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true, // Ceci garantit l'unicité
    trim: true, // Supprime les espaces inutiles
  },
    members: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Assuming you have a User model
    }],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  });
  
  module.exports= mongoose.model('Group', groupSchema);

  