const mongoose = require("mongoose");


const groupSchema = new mongoose.Schema({
    name: {
      type: String,
      required: true,
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

  