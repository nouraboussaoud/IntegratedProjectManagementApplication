const express = require("express");
const {
  registerUser,
  loginUser,
  logoutUser,
  deleteUser,
  updateUser,
  toggleUserStatus,
} = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");
const { isAdmin } = require("../middleware/roleMiddleware"); // Import the isAdmin middleware

const router = express.Router();

// Routes for User Authentication & Management
router.post("/register", registerUser); // Sign up
router.post("/login", loginUser); // Sign in
router.post("/logout", protect, logoutUser); // Sign out (protected route)

router.put("/update/:id", protect, updateUser); // Modify account (protected route)

router.delete("/delete/:id", protect, isAdmin, deleteUser); // Only admins can delete users (protected route)
router.put("/toggle-status/:id", protect, isAdmin, toggleUserStatus); // Only admins can activate/deactivate users (protected route)

module.exports = router;
