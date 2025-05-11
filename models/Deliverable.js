const mongoose = require('mongoose');

const evaluationSchema = new mongoose.Schema({
  evaluationScore: {
    type: Number,
    min: 0,
    max: 100,
  },
  notes: String,
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
      url: String, // Cloudinary URL
      public_id: String, // Cloudinary public ID
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
    evaluation: evaluationSchema,
    cachedText: {
      type: String, // Stores cleaned text from PDF for plagiarism checks
      default: null,
    },
  },
  { timestamps: true }
);

// Index for faster queries on file.url
deliverableSchema.index({ 'file.url': 1 });

const Deliverable = mongoose.model('Deliverable', deliverableSchema);
module.exports = Deliverable;