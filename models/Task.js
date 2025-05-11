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
    progressPercentage: {
      type: Number,
      default: 0,
    },
    deadline: {
      type: Date,
      required: false,
    },
    completedOn: {
      type: Date,
      default: null,
    },
    timeSpent: {
      type: Number,
      default: 0,
    },
    revisions: {
      type: Number,
      default: 0,
    },
    missedDeadlines: {
      type: Number,
      default: 0,
    },
    taskDetails: {
      type: String,
      required: false,
    },
    risk: {
      type: String,
      enum: ['High Risk', 'Low Risk', 'Unknown'],
      default: 'Unknown',
    },
    riskConfidence: {
      type: Number,
      default: 0,
    },
    repoOwner: {
      type: String,
      required: false,
    },
    repoName: {
      type: String,
      required: false,
    },
    branchName: {
      type: String,
      required: false,
    },
    quizzes: [{
      questions: [{
        question: {
          type: String,
          required: true,
        },
        options: [{
          type: String,
          required: true,
        }],
        correctAnswer: {
          type: String,
          required: true,
        },
        explanation: {
          type: String,
          required: true,
        },
      }],
      createdAt: {
        type: Date,
        default: Date.now,
      },
      attempts: [{
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        score: {
          type: Number,
          required: true,
        },
        results: [{
          question: String,
          studentAnswer: String,
          correctAnswer: String,
          isCorrect: Boolean,
          explanation: String,
        }],
        completedAt: {
          type: Date,
          default: Date.now,
        },
        passed: {
          type: Boolean,
          required: true,
        },
      }],
    }],
    hasPassedQuiz: {
      type: Boolean,
      default: false
    },
});

module.exports = mongoose.model('Task', taskSchema);
