const mongoose = require("mongoose");

const deliverableSchema = new mongoose.Schema({
    title: {
          type: String,
          required: true,
        },
    student_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User', // Assuming you have a User model
        },
    submission_date: {
          type: Date,
          default: Date.now,
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
        evaluation_score: {
            type: Number,
        },
        evaluation_feedback: {
            type: String,
        },
        status: {
            type: String,
            enum: ['pending', 'evaluated','rejected'],
            }
      });
      
module.exports= mongoose.model('Deliverable', deliverableSchema);