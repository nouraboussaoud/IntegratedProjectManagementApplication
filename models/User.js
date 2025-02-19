const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const UserSchema = new mongoose.Schema({
  googleId: { type: String, required: true, unique: true },
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: false, // Rendre le champ optionnel
        
    },
    role: {
        type: String,
        enum: ["admin", "tutor", "student"],
        default: "student"
    },
    isAdmin: {
        type: Boolean,
        default: false,
      },
    isActive: {
        type: Boolean,
        default: false
    },
    verificationToken: 
        {type:String ,},
    isBanned: {
        type:Boolean,
        default:false
      },
      profilePic: {
        type: String
      },
      provider:{
        type: String
      },
       
}, { timestamps: true });



module.exports = mongoose.model("User", UserSchema);
