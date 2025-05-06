const User = require("../models/User");
const nodemailer = require('nodemailer');
const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const passport = require('passport');
const path = require('path');
const fs = require('fs');

const mongoose = require('mongoose');
const { log } = require("console");
const secretKey = process.env.JWT_SECRET_KEY || 'mysecretkey';

// Setup mail transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'aboussaoudnour436@gmail.com', // Update with your email
        pass: process.env.MAIL_PASSWORD // Update with your email password (use environment variables for security in production)
    }
});

const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({});
        res.json(users);
      } catch (err) {
        console.error('Error fetching users', err);
        res.status(500).json({ message: 'Internal server error' });
      }
    };

  
    
  // Register (Sign Up) with file upload
  const registerUser = async (req, res) => {
      const { name, email, password, role } = req.body;
  
      // Ensure role is either 'student' or 'tutor' (No admin registration)
      if (!["student", "tutor"].includes(role)) {
          return res.status(400).json({ message: "Invalid role selection" });
      }
  
      try {
          // Check if the user already exists
          const userExists = await User.findOne({ email });
          console.log
          if (userExists) {
              return res.status(400).json({ message: "User already exists" });
          }
  // Hash the password during registration
        const saltRounds = 10; 
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        console.log('Hashed Password:', hashedPassword);  // Verify the output here


  
          // Create a new user with the hashed password and optional profile picture
          const user = new User({
              name,
              email,
              password: hashedPassword,
              role,
              verificationToken: crypto.randomBytes(20).toString('hex'),
              profilePic: req.file ? req.file.filename : undefined, // Save the uploaded profile picture filename
          });
  
          // Save the user to the database
          await user.save();
          console.log('Password:', password); // Log the plain password
            console.log('Hashed Password:', hashedPassword); // Log the hashed password
  
          // Send a verification email
          const mailOptions = {
              from: 'aboussaoudnour436@gmail.com', // Update to your email
              to: user.email,
              subject: 'Verify your email address',
              text: `Please click on this link to verify your email address: http://localhost:5000/api/users/verify-email/${user.verificationToken}`,
          };
  
          await transporter.sendMail(mailOptions);
          console.log('Sending email to:', user.email);
  
          // Respond with a success message
          res.status(201).json({ message: "User registered successfully", user });
      } catch (error) {
        console.error('Registration error:', error); // Log the full error
        res.status(500).json({ message: "Server error", error: error.message });
    }
  };
 
  const loginUser = async (req, res) => { 
    try {
        // Find the user
        const user = await User.findOne({ email: req.body.email });
        
        // If no user found, return early
        if (!user) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        console.log('User found:', user); // Debugging log

        // Compare passwords 
        const isMatch = await bcrypt.compare(req.body.password, user.password);
        
        console.log('Password match:', isMatch); // Debugging log

        if (!isMatch) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        if (!user.isActive) {
            return res.status(401).json({ message: 'Please verify your email to activate your account' });
        }

        if (user.isBanned) {
            return res.status(401).json({ message: 'Your account is banned' });
        }


      
        const token = jwt.sign(
            { userId: user._id, role: user.role, accessToken: user.accessToken }, // Include accessToken
            secretKey, 
            { expiresIn: '24h' }
        );
        console.log('Token generated successfully'); // Debugging log

        // Send single response with all necessary data
        return res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                _id: user._id,
                email: user.email,
                role: user.role,
                name: user.name,
                profilePic: user.profilePic
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ 
            message: 'Server error', 
            error: error.message 
        });
    }
};
  

// Logout (Sign Out)
const logoutUser = (req, res) => {
    res.status(200).json({ message: "Logout successful" });
    console.log("Logout successful");
}

// Verify Token
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    console.log('Received Token:', token);  // Debugging log

    if (!token) {
        return res.status(401).json({ message: 'Token missing' });
    }

    try {
        const decoded = jwt.verify(token, secretKey);
        req.userId = decoded.userId;
        next();
    } catch (err) {
        console.error('Token verification failed:', err);  // Detailed error logging

        res.status(401).json({ message: 'Invalid token' });
    }
};

// Modify Account (Update User)
const updateUser = async (req, res) => {
    const { name, email, role } = req.body;

    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        // Verify the user is updating their own profile or is an admin
        if (req.userId !== req.params.id && req.userRole !== 'admin') {
          return res.status(403).json({ 
            message: 'Unauthorized: You can only update your own profile' 
          });
        }

        user.name = name || user.name;
        user.email = email || user.email;
        if (role && ["student", "tutor"].includes(role)) {
            user.role = role;
        }

        // Handle profile picture if included in the request
        if (req.file) {
            // If user already has a profile picture, delete the old one
            if (user.profilePic) {
                const oldPicPath = path.join(__dirname, '..', 'uploads', 'profiles', user.profilePic);
                if (fs.existsSync(oldPicPath)) {
                    fs.unlinkSync(oldPicPath);
                }
            }
            
            // Update with new profile picture
            user.profilePic = req.file.filename;
        }

        await user.save();
        res.status(200).json({ 
            message: "User updated successfully", 
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                profilePic: user.profilePic
            }
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Delete Account
const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        await user.deleteOne();
        res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
};

// Activate / Deactivate Account
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

// Get User by ID
const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
};

// Update Password
const updatePassword = async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const userId = req.params.id;

    try {
        const user = await User.findOne({ _id: userId });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const isOldPasswordCorrect =  bcrypt.compare(oldPassword, user.password);
        if (!isOldPasswordCorrect) {
            return res.status(401).json({ message: 'Incorrect old password' });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedNewPassword;

        await user.save();
        res.json({ message: 'Password updated' });
    } catch (error) {
        console.error('Error updating password', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Verify Email
const verifyEmail = async (req, res) => {
    const token = req.params.verificationToken; // Extract the token from the URL params

    try {
        // Find the user by the verification token
        const user = await User.findOne({ verificationToken: token });
        if (!user) return res.status(404).json({ message: 'Invalid verification token' });

        // Activate the user and remove the verification token
        user.isActive = true; // Ensure this matches the field in your user model
        user.verificationToken = undefined; // Remove the verification token
        await user.save();

        res.json({ message: 'Email address verified successfully' });
    } catch (error) {
        console.error('Error verifying email address:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Forgot Password
const forgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const newPassword = Math.random().toString(36).slice(-8);
        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        const mailOptions = {
            from: 'aboussaoudnour436@gmail.com',
            to: email,
            subject: 'Your New Password',
            text: `Dear user, after your request to recover the password, your new one will be: ${newPassword}`,
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log(error);
                return res.status(500).json({ message: 'Error sending email' });
            } else {
                console.log('Email sent: ' + info.response);
                return res.status(200).json({ message: 'Password updated and email sent successfully' });
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// Ban User
const toggleBanStatus = async (req, res) => {
    const userId = req.params.id;
    const { action } = req.body; // Expecting "ban" or "unban" in the request body

    try {
        // Find the user by ID
        const user = await User.findOne({ _id: userId });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Determine the action and validate the current status
        if (action === "ban") {
            if (user.isBanned) {
                return res.status(400).json({ message: 'User is already banned' });
            }
            user.isBanned = true;
        } else if (action === "unban") {
            if (!user.isBanned) {
                return res.status(400).json({ message: 'User is not banned' });
            }
            user.isBanned = false;
        } else {
            return res.status(400).json({ message: 'Invalid action. Use "ban" or "unban".' });
        }

        // Save the updated user
        await user.save();

        // Send an email notification
        const mailOptions = {
            from: 'aboussaoudnour436@gmail.com', // Replace with your email
            to: user.email,
            subject: `Your account has been ${action === "ban" ? "banned" : "unbanned"}`,
            text: `Your account has been ${action === "ban" ? "banned. For more information, please contact us." : "unbanned."}`,
        };

        await transporter.sendMail(mailOptions);

        // Respond with success
        res.json({ message: `User ${action === "ban" ? "banned" : "unbanned"} successfully` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
// Add these to your userController.js file


// GitHub Auth Initialization
const githubAuth = passport.authenticate('github', { scope: ['user:email'] });

// GitHub Auth Callback
const githubCallback = (req, res, next) => {
  passport.authenticate('github', { session: false }, (err, user, info) => {
    if (err) {
      console.error("GitHub authentication error:", err);
      return res.redirect('http://localhost:3000/login?error=github_auth_failed');
    }
    
    if (!user) {
      console.error("GitHub authentication failed - no user:", info);
      return res.redirect('http://localhost:3000/login?error=github_auth_failed');
    }
    
    // Generate JWT token
    const secretKey = process.env.JWT_SECRET || 'mysecretkey';
    const token = jwt.sign(
      { id: user._id, role: user.role }, 
      secretKey, 
      { expiresIn: '1h' }
    );
    
    // Redirect to frontend with token
    console.log("token", token);
    
    res.redirect(`http://localhost:3000/student-dashboard?token=${token}`);
      })(req, res, next);

};
const getAvailableSkills = (req, res) => {
    try {
      // Liste fixe des compétences
      const skills = [
        "javascript", "python", "java", "c#", "c++", "react", "angular", 
        "vue.js", "node.js", "express", "mongodb", "mysql", "postgresql",
        "docker", "git", "aws", "azure", "machine learning", "data science",
        "cybersecurity", "typescript", "php", "ruby", "swift", "kotlin",
        "django", "flask", "spring", "laravel", "tensorflow", "pytorch", 
        "nlp", "computer vision" , "redux" , "graphql" , "flutter" , "react native" , "jest" , "css" , "sql" , "airflow" , "pyspark" ,"kubernetes", "helm", "istio", "serverless", "terraform", 
  "prometheus", "grafana", "argoCD", "vault", "grpc", 
  "keda", "kubeflow", "jenkins", "github actions", "opa"
];
      res.status(200).json(skills);
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
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
        message: "Compétences mises à jour",
        skills: user.skills
      });
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  };
  const getCurrentUserSkills = async (req, res) => {
    try {
      const userId = req.userId; // extrait depuis verifyToken
  
      const user = await User.findById(userId).select('skills');
      if (!user) return res.status(404).json({ message: "User not found" });
  
      res.status(200).json(user.skills);
    } catch (error) {
      console.error("Error fetching user skills:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };

// Update Profile Picture
const updateProfilePicture = async (req, res) => {
  try {
    // Check if a file was uploaded
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const userId = req.params.id;
    
    // Verify the user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Verify the user is updating their own profile or is an admin
    if (req.userId !== userId && req.userRole !== 'admin') {
      return res.status(403).json({ 
        message: 'Unauthorized: You can only update your own profile picture' 
      });
    }

    // If user already has a profile picture, delete the old one
    if (user.profilePic) {
      const oldPicPath = path.join(__dirname, '..', 'uploads', 'profiles', user.profilePic);
      if (fs.existsSync(oldPicPath)) {
        fs.unlinkSync(oldPicPath);
      }
    }

    // Update user with new profile picture filename
    user.profilePic = req.file.filename;
    await user.save();

    // Return success with the updated user
    res.status(200).json({ 
      message: 'Profile picture updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePic: user.profilePic
      }
    });
  } catch (error) {
    console.error('Error updating profile picture:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
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
    getAllUsers ,
    githubAuth,
    githubCallback,
    getAvailableSkills,   
    updateUserSkills,
    getCurrentUserSkills,
    updateProfilePicture
};
