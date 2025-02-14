const express = require("express");
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
} = require("../controllers/userController");

const { isAdmin } = require("../middleware/roleMiddleware");
const {upload} = require("../middleware/uploadimage");
const router = express.Router();

// Protect the routes with verifyToken middleware
router.post('/register', upload.single('profilePic'), registerUser); // 'profilePic' should match the name in your frontend form
router.post('/login',loginUser); // Login doesn't require token
router.post('/logout', verifyToken, logoutUser); // Logout requires token

// Protected routes with verifyToken middleware
router.put('/update/:id', verifyToken, updateUser); // Update user requires token
router.delete('/delete/:id', verifyToken, isAdmin, deleteUser); // Delete user requires token
router.put('/toggle-status/:id', verifyToken, isAdmin , toggleUserStatus); // Toggle status requires token
router.get('/:id', verifyToken, getUserById); // Get user by ID requires token
router.put('/update-password/:id', verifyToken, updatePassword); // Update password requires token
router.get('/verify-email/:verificationToken', verifyEmail);
router.post('/forgot-password', forgotPassword); // Forgot password doesn't require token
router.put('/ban-user/:id', verifyToken, isAdmin,banUser); // Ban user requires token
router.put('/unban-user/:id', verifyToken, isAdmin , unbanUser); // Unban user requires token

module.exports = router;