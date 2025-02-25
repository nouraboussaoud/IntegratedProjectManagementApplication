const express = require("express");
const passport = require('passport'); // Add this line
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
  toggleBanStatus
} = require("../controllers/userController");

const { isAdmin } = require("../middleware/roleMiddleware");
const { upload } = require("../middleware/uploadimage");
const router = express.Router();

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

// GitHub Authentication Routes
//router.get('/auth/github', githubAuth);
//router.get('/auth/github/callback', passport.authenticate('github', { failureRedirect: '/login' }), githubCallback);

module.exports = router;