const mongoose = require("mongoose");


const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  assignedSubjects: [{  // Ajoutez ce nouveau champ
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Group', groupSchema);

  