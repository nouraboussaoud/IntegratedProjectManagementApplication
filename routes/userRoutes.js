const express = require('express');
const User = require("../models/User");
const jwt = require('jsonwebtoken');
const bcrypt = require("bcrypt");
 // Middleware d'authentification
const passport =require ("passport");
const {
 
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
  getAllUsers,
  toggleBanStatus,
  githubAuth,
  githubCallback,
  getAvailableSkills,   
    updateUserSkills,
    getCurrentUserSkills     
 
  
} = require("../controllers/userController");


const { isAdmin } = require("../middleware/roleMiddleware");
const { upload } = require("../uploadimage");
const router = express.Router();
router.get("/google", 
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get("/google/callback", 
  passport.authenticate("google", { failureRedirect: "/login/failed" }),
  async (req, res) => {
    if (!req.user) {
      console.error("❌ Aucun utilisateur trouvé après Google Auth.");
      return res.redirect("http://localhost:3000/login?error=auth_failed");
    }

    console.log("✅ Utilisateur authentifié :", req.user);

    // Générer un token JWT avec le rôle
    const token = jwt.sign(
      { userId: req.user._id, role: req.user.role },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "1h" }
    );

    // Construire l'URL de redirection avec le rôle
    const redirectURL = `http://localhost:3000/login?token=${token}&role=${req.user.role}`;
    console.log("✅ URL de redirection :", redirectURL);

    // Rediriger le frontend
    res.redirect(redirectURL);
  }
);




// Protect the routes with verifyToken middleware
router.get('/getAll', verifyToken, getAllUsers); // Get all users requires token
router.post('/register', upload.single('profilePic'), registerUser); // 'profilePic' should match the name in your frontend form 🚀
router.post('/login', loginUser); // Login doesn't require token 🚀
router.post('/logout', verifyToken, logoutUser); // Logout requires token 🚀

// Protected routes with verifyToken middleware
router.put('/update/:id', verifyToken, updateUser); // Update user requires token
router.delete('/delete/:id', verifyToken,deleteUser); // Delete user requires token
router.put('/toggle-status/:id', verifyToken, toggleUserStatus); // Toggle status requires token
router.get('/:id', verifyToken, getUserById); // Get user by ID requires token
router.put('/update-password/:id', verifyToken, updatePassword); // Update password requires token  ///
router.get('/verify-email/:verificationToken', verifyEmail); //🚀
router.post('/forgot-password', forgotPassword); // Forgot password doesn't require token done with front 🚀
router.put('/ban-user/:id', verifyToken, toggleBanStatus); // Ban user requires token 🚀

router.get('/auth/github', githubAuth);
router.get('/auth/github/callback', githubCallback);

router.get('/skills',  getAvailableSkills);
router.put('/skills', verifyToken, updateUserSkills);
router.get('/me/skills', verifyToken, getCurrentUserSkills);

module.exports = router;