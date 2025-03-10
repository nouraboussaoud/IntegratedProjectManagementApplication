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
  githubCallback
} = require("../controllers/userController");


const { isAdmin } = require("../middleware/roleMiddleware");
const { upload } = require("../uploadimage");
const router = express.Router();
router.get("/google", 
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Route pour gérer la redirection de Google OAuth
router.get("/google/callback", 
  passport.authenticate("google", { 
    failureRedirect: "/login/failed"
  }),
  (req, res) => {
    const user = req.user; // Récupérer l'utilisateur de la requête après l'authentification avec Google
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' }); // Créer un token JWT
    const userData = {
      name: user.name,
      email: user.email,
      profilePic: user.profilePic,
    };
    res.redirect(`${process.env.CLIENT_URL}/student-dashboard`); // Redirige vers la bonne page après connexion
  }
);

// Protect the routes with verifyToken middleware
router.get('/getAll', verifyToken, getAllUsers); // Get all users requires token
router.post('/register', upload.single('profilePic'), registerUser); // 'profilePic' should match the name in your frontend form 🚀
router.post('/login', loginUser); // Login doesn't require token 🚀
router.post('/logout', verifyToken, logoutUser); // Logout requires token 🚀

// Protected routes with verifyToken middleware
router.put('/update/:id', verifyToken, updateUser); // Update user requires token
router.delete('/delete/:id', verifyToken, isAdmin, deleteUser); // Delete user requires token
router.put('/toggle-status/:id', verifyToken, isAdmin, toggleUserStatus); // Toggle status requires token
router.get('/:id', verifyToken, getUserById); // Get user by ID requires token
router.put('/update-password/:id', verifyToken, updatePassword); // Update password requires token  ///
router.get('/verify-email/:verificationToken', verifyEmail); //🚀
router.post('/forgot-password', forgotPassword); // Forgot password doesn't require token done with front 🚀
router.put('/ban-user/:id', verifyToken, toggleBanStatus); // Ban user requires token 🚀

router.get('/auth/github', githubAuth);
router.get('/auth/github/callback', githubCallback);



module.exports = router;