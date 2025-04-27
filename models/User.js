const mongoose = require("mongoose");
const bcrypt = require("bcrypt");


const UserSchema = new mongoose.Schema({
  googleId: { type: String, unique: true, sparse: true },
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
  },
  skills: {
    type: [String],
    default: [],
    validate: {
      validator: function(skills) {
        // Limite à 10 compétences maximum
        return skills.length <= 10;
      },
      message: "Vous ne pouvez pas sélectionner plus de 10 compétences"
    }
  }
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);