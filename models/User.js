const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema({
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
        {type:String},
      isBanned: {
        type:Boolean,
        default:false
      },
      profilePic: {
        type: String
      },
      provider:{
        type: String
      }
}, { timestamps: true });

// Hash password before saving
UserSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compare passwords for login
UserSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", UserSchema);
