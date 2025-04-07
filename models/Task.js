const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed'],
      default: 'pending',
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },

    // 🔹 Progress Tracking Fields
    progressPercentage: {
      type: Number,
      default: 0, // Starts at 0%
    },
    deadline: {
      type: Date,
      required: false, // Ensure tasks have a deadline
    },
    completedOn: {
      type: Date, // Captures the actual completion date
      default: null,
    },
    timeSpent: {
      type: Number,
      default: 0, // Tracks time spent in hours
    },
    revisions: {
      type: Number,
      default: 0, // Number of times the task was revised
    },
    missedDeadlines: {
      type: Number,
      default: 0, // Tracks how many times a deadline was missed
    }
});

module.exports = mongoose.model('Task', taskSchema);
