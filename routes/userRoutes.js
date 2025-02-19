const express = require("express");
const router = express.Router();
const User = require("../models/User");
const jwt = require('jsonwebtoken');
const bcrypt = require("bcrypt");
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
  banUser,
  unbanUser,
  getAllUsers,
  toggleBanStatus
} = require("../controllers/userController");

const { isAdmin } = require("../middleware/roleMiddleware");
const {upload} = require("../middleware/uploadimage");

// Route pour initier l'authentification Google
router.get("/google", 
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Route pour gérer la redirection de Google OAuth
router.get("/google/callback", 
  passport.authenticate("google", { 
    failureRedirect: "/login/failed"
  }),
  (req, res) => {
    res.redirect(`${process.env.CLIENT_URL}/dashboard`); // Redirige vers la bonne page après connexion
  }
);

// Route pour vérifier si l'utilisateur est bien authentifié
router.get("/login/success", (req, res) => {
  if (req.user) {
    res.status(200).json({
      success: true,
      message: "Authentication successful",
      user: req.user,
    });
  } else {
    res.status(403).json({
      error: true,
      message: "Not authorized",
    });
  }
});

// Route pour gérer la déconnexion
router.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.redirect(process.env.CLIENT_URL);
  });
});
// Protect the routes with verifyToken middleware
router.get('/getAll', verifyToken, getAllUsers); // Get all users requires token
router.post('/register', upload.single('profilePic'), registerUser); // 'profilePic' should match the name in your frontend form 🚀
router.post('/login',loginUser); // Login doesn't require token 🚀
router.post('/logout', verifyToken, logoutUser); // Logout requires token 🚀

// Protected routes with verifyToken middleware
router.put('/update/:id', verifyToken, updateUser); // Update user requires token
router.delete('/delete/:id', verifyToken, isAdmin, deleteUser); // Delete user requires token
router.put('/toggle-status/:id', verifyToken, isAdmin , toggleUserStatus); // Toggle status requires token
router.get('/:id', verifyToken, getUserById); // Get user by ID requires token
router.put('/update-password/:id', verifyToken, updatePassword); // Update password requires token  ///
router.get('/verify-email/:verificationToken', verifyEmail); //🚀
router.post('/forgot-password', forgotPassword); // Forgot password doesn't require token done with front 🚀
router.put('/ban-user/:id', verifyToken,toggleBanStatus); // Ban user requires token 🚀


module.exports = router;