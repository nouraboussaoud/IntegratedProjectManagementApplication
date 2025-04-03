const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema({
  title: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  keyFeatures: [
    {
      title: String,
      description: String,
    },
  ],
  aiFunctionalities: [
    {
      title: String,
      description: String,
    },
  ],

assignedGroups: [{
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Group'
}],

createdAt: { type: Date, default: Date.now },
});
subjectSchema.pre('find', function() {
  this.populate('assignedGroups', 'name members');
});
module.exports = mongoose.model("Subject", subjectSchema);
