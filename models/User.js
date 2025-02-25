const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: { 
    type: String, 
    unique: true, 
    sparse: true 
  },
  password: {
    type: String,
    required: function() {
      return this.provider === 'local';
    }
  },
  provider: {
    type: String,
    enum: ['local', 'github', 'google'],
    default: 'local'
  },
  githubId: {
    type: String,
    unique: true,
    sparse: true
  },
  role: {
    type: String,
    enum: ["admin", "tutor", "student"],
    default: "student"
  },
  isActive: {
    type: Boolean,
    default: false
  },
  profilePic: {
    type: String
  },
  verificationToken: {
    type: String
  },
  isBanned: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);