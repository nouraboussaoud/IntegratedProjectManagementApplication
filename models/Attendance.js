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
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model("Attendance", attendanceSchema);