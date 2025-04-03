const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema({
  title: { 
    type: String,
    required: [true, 'Title is required'],
    maxlength: [100, 'Title cannot exceed 100 characters'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [500, 'Description cannot exceed 500 characters'],
    trim: true
  },
  keyFeatures: [{
    title: {
      type: String,
      required: [true, 'Feature title is required'],
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Feature description is required'],
      trim: true
    }
  }],
  aiFunctionalities: [{
    title: {
      type: String,
      required: [true, 'Functionality title is required'],
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Functionality description is required'],
      trim: true
    }
  }],
  assignedGroups: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  }],
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Ajouter une validation pré-enregistrement
subjectSchema.pre('save', function(next) {
  // S'assurer qu'il y a au moins une fonctionnalité clé
  if (this.keyFeatures.length === 0) {
    this.keyFeatures = undefined; // Force la validation à échouer
  }
  next();
});
subjectSchema.pre('find', function() {
  this.populate('assignedGroups', 'name members');
});
module.exports = mongoose.model("Subject", subjectSchema);
