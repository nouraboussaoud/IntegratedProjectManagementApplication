const mongoose = require('mongoose');

const evaluationSchema = new mongoose.Schema({
  score: {
    type: Number,
    min: 0,
    max: 100
  },
  notes: String,
  checklist: {
    requirement1: Boolean,
    requirement2: Boolean,
    requirement3: Boolean
  },
  rubricScores: {
    // Dynamic structure for rubric scores
  },
  evaluated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  evaluated_at: {
    type: Date
  }
});

const deliverableSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    file: {
      type: String,
      required: true,
    },
    github_commit_url: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'evaluated'],
      default: 'pending',
    },
    submission_date: {
      type: Date,
      default: Date.now,
      required: true,
    },
    evaluation: evaluationSchema // Add evaluation subdocument
  },
  { timestamps: true }
);

const Deliverable = mongoose.model('Deliverable', deliverableSchema);
module.exports = Deliverable;