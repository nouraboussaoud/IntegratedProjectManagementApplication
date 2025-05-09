const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Group",
    required: true
  },
  sessionDate: {
    type: Date,
    required: true
  },
  presentMembers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],
  absentMembers: [{
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    isJustified: {
      type: Boolean,
      default: false
    },
    justification: String,
    followUpType: {
      type: String,
      enum: ["Normal follow-up day", "Validation day"],
      default: "Normal follow-up day"
    },

  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  lastModified: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model("Attendance", attendanceSchema);