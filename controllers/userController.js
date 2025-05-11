const User = require("../models/User");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const passport = require("passport");
const path = require("path");
const fs = require("fs");
const { 
  getVerificationEmailTemplate, 
  getPasswordResetTemplate, 
  getAccountStatusTemplate 
} = require("../Utils/emailTemplates");

const mongoose = require("mongoose");
const secretKey = process.env.JWT_SECRET_KEY || "mysecretkey";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "aboussaoudnour436@gmail.com",
    pass: process.env.MAIL_PASSWORD,
  },
});

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users);
  } catch (err) {
    console.error("Error fetching users", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const registerUser = async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!["student", "tutor"].includes(role)) {
    return res.status(400).json({ message: "Invalid role selection" });
  }

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      verificationToken: crypto.randomBytes(20).toString("hex"),
      profilePic: req.file ? req.file.filename : undefined,
    });

    await user.save();

    const mailOptions = {
      from: "aboussaoudnour436@gmail.com",
      to: user.email,
      subject: "Verify your email address",
      html: getVerificationEmailTemplate(user.name, user.verificationToken),
    };

    await transporter.sendMail(mailOptions);
    res.status(201).json({ message: "User registered successfully", user });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }
    

    const isMatch = await bcrypt.compare(req.body.password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: "Please verify your email to activate your account" });
    }

    if (user.isBanned) {
      return res.status(401).json({ message: "Your account is banned" });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      secretKey,
      { expiresIn: "24h" }
    );

    console.log("Generated Token Payload:", { userId: user._id, role: user.role }); // Debug log

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        _id: user._id,
        email: user.email,
        role: user.role,
        name: user.name,
        profilePic: user.profilePic,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const logoutUser = (req, res) => {
  res.status(200).json({ message: "Logout successful" });
};

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  console.log("Received Token:", token); // Debug log

  if (!token) {
    return res.status(401).json({ message: "Token missing" });
  }

  try {
    const decoded = jwt.verify(token, secretKey);
    console.log("Decoded Token:", decoded); // Debug log
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch (err) {
    console.error("Token verification failed:", err);
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    }
    return res.status(401).json({ message: "Invalid token" });
  }
};

const updateUser = async (req, res) => {
  const { name, email, role } = req.body;

  // Log incoming payload to check for unintended fields
  console.log("Update Payload:", req.body);

  // Validate payload
  const allowedFields = ["name", "email", "role"];
  const receivedFields = Object.keys(req.body);
  const invalidFields = receivedFields.filter((field) => !allowedFields.includes(field));
  if (invalidFields.length > 0) {
    console.log("Invalid fields received:", invalidFields);
    return res.status(400).json({ message: `Invalid fields in request: ${invalidFields.join(", ")}` });
  }

  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    console.log("Before Update:", {
      userId: req.userId,
      userRole: req.userRole,
      targetUserId: req.params.id,
      targetUserRole: user.role,
      isActive: user.isActive,
    }); // Debug log

    // Authorization check
    const isAdmin = req.userRole === "admin";
    const isOwnProfile = req.userId === req.params.id;
    const isTutorUpdatingStudent = req.userRole === "tutor" && user.role === "student";

    if (!isAdmin && !isOwnProfile && !isTutorUpdatingStudent) {
      console.log("Authorization failed:", {
        isAdmin,
        isOwnProfile,
        isTutorUpdatingStudent,
      }); // Debug log
      return res.status(403).json({
        message: "Unauthorized: Tutors can only update student profiles, or update your own profile",
      });
    }

    // Prepare update object
    const updateFields = {};
    if (name) updateFields.name = name;
    if (email) updateFields.email = email;
    if (role && ["student", "tutor"].includes(role)) {
      updateFields.role = role;
    }

    // Handle profile picture if provided
    if (req.file) {
      if (user.profilePic) {
        const oldPicPath = path.join(__dirname, "..", "Uploads", "profiles", user.profilePic);
        if (fs.existsSync(oldPicPath)) {
          fs.unlinkSync(oldPicPath);
        }
      }
      updateFields.profilePic = req.file.filename;
    }

    // Perform update with $set to ensure only specified fields are modified
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    console.log("After Update:", {
      userId: req.params.id,
      isActive: updatedUser.isActive,
      updatedFields: updateFields,
    }); // Debug log

    res.status(200).json({
      message: "User updated successfully",
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        profilePic: updatedUser.profilePic,
        isActive: updatedUser.isActive, // Include for debugging
      },
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    console.log("Delete Request:", {
      userId: req.userId,
      userRole: req.userRole,
      targetUserId: req.params.id,
      targetUserRole: user.role,
    }); // Debug log

    if (
      req.userRole !== "admin" &&
      !(req.userRole === "tutor" && user.role === "student")
    ) {
      return res.status(403).json({
        message: "Unauthorized: Tutors can only delete student accounts",
      });
    }

    await user.deleteOne();
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.isActive = !user.isActive;
    await user.save();

    res.status(200).json({ message: `User ${user.isActive ? "activated" : "deactivated"}`, user });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

const updatePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.params.id;

  try {
    const user = await User.findOne({ _id: userId });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isOldPasswordCorrect = await bcrypt.compare(oldPassword, user.password);
    if (!isOldPasswordCorrect) {
      return res.status(401).json({ message: "Incorrect old password" });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedNewPassword;

    await user.save();
    res.json({ message: "Password updated" });
  } catch (error) {
    console.error("Error updating password", error);
    res.status(500).json({ message: "Server error" });
  }
};

const verifyEmail = async (req, res) => {
  const token = req.params.verificationToken;

  try {
    const user = await User.findOne({ verificationToken: token });
    if (!user) return res.status(404).json({ message: "Invalid verification token" });

    user.isActive = true;
    user.verificationToken = undefined;
    await user.save();

    res.json({ message: "Email address verified successfully" });
  } catch (error) {
    console.error("Error verifying email address:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const newPassword = Math.random().toString(36).slice(-8);
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    const mailOptions = {
      from: "aboussaoudnour436@gmail.com",
      to: email,
      subject: "Your New Password",
      html: getPasswordResetTemplate(user.name, newPassword),
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
        return res.status(500).json({ message: "Error sending email" });
      } else {
        console.log("Email sent: " + info.response);
        return res.status(200).json({ message: "Password updated and email sent successfully" });
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

const toggleBanStatus = async (req, res) => {
  const userId = req.params.id;
  const { action } = req.body;

  try {
    const user = await User.findOne({ _id: userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (action === "ban") {
      if (user.isBanned) {
        return res.status(400).json({ message: "User is already banned" });
      }
      user.isBanned = true;
    } else if (action === "unban") {
      if (!user.isBanned) {
        return res.status(400).json({ message: "User is not banned" });
      }
      user.isBanned = false;
    } else {
      return res.status(400).json({ message: 'Invalid action. Use "ban" or "unban".' });
    }

    await user.save();

    // Send an email notification
    const mailOptions = {
      from: "aboussaoudnour436@gmail.com",
      to: user.email,
      subject: `Your account has been ${action === "ban" ? "banned" : "unbanned"}`,
      html: getAccountStatusTemplate(user.name, action === "ban"),
    };

    await transporter.sendMail(mailOptions);

    res.json({ message: `User ${action === "ban" ? "banned" : "unbanned"} successfully` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const githubAuth = passport.authenticate("github", { scope: ["user:email"] });

const githubCallback = (req, res, next) => {
  passport.authenticate("github", { session: false }, (err, user, info) => {
    if (err) {
      console.error("GitHub authentication error:", err);
      return res.redirect("http://localhost:3000/login?error=github_auth_failed");
    }

    if (!user) {
      console.error("GitHub authentication failed - no user:", info);
      return res.redirect("http://localhost:3000/login?error=github_auth_failed");
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      secretKey,
      { expiresIn: "1h" }
    );

    res.redirect(`http://localhost:3000/student-dashboard?token=${token}`);
  })(req, res, next);
};

const getAvailableSkills = (req, res) => {
  try {
    const skills = [
      "javascript",
      "python",
      "java",
      "c#",
      "c++",
      "react",
      "angular",
      "vue.js",
      "node.js",
      "express",
      "mongodb",
      "mysql",
      "postgresql",
      "docker",
      "git",
      "aws",
      "azure",
      "machine learning",
      "data science",
      "cybersecurity",
      "typescript",
      "php",
      "ruby",
      "swift",
      "kotlin",
      "django",
      "flask",
      "spring",
      "laravel",
      "tensorflow",
      "pytorch",
      "nlp",
      "computer vision",
      "redux",
      "graphql",
      "flutter",
      "react native",
      "jest",
      "css",
      "sql",
      "airflow",
      "pyspark",
      "kubernetes",
      "helm",
      "istio",
      "serverless",
      "terraform",
      "prometheus",
      "grafana",
      "argoCD",
      "vault",
      "grpc",
      "keda",
      "kubeflow",
      "jenkins",
      "github actions",
      "opa",
    ];
    res.status(200).json(skills);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

const updateUserSkills = async (req, res) => {
  try {
    const { skills } = req.body;
    const user = await User.findByIdAndUpdate(
      req.userId,
      { skills },
      { new: true }
    );
    res.status(200).json({
      message: "Skills updated",
      skills: user.skills,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

const getCurrentUserSkills = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("skills");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json(user.skills);
  } catch (error) {
    console.error("Error fetching user skills:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const updateProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Authorization check - only allow users to update their own profile picture or admins
    const isAdmin = req.userRole === "admin";
    const isOwnProfile = req.userId === userId;
    
    if (!isAdmin && !isOwnProfile) {
      return res.status(403).json({
        message: "Unauthorized: You can only update your own profile picture",
      });
    }

    // Delete old profile picture if it exists
    if (user.profilePic) {
      const oldPicPath = path.join(__dirname, "..", "uploads", "profiles", user.profilePic);
      if (fs.existsSync(oldPicPath)) {
        fs.unlinkSync(oldPicPath);
      }
    }

    // Update user with new profile picture
    user.profilePic = req.file.filename;
    await user.save();

    res.status(200).json({
      message: "Profile picture updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePic: user.profilePic,
      },
    });
  } catch (error) {
    console.error("Error updating profile picture:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  verifyToken,
  getUserById,
  updatePassword,
  verifyEmail,
  forgotPassword,
  toggleBanStatus,
  getAllUsers,
  githubAuth,
  githubCallback,
  getAvailableSkills,
  updateUserSkills,
  getCurrentUserSkills,
  updateProfilePicture,
};
