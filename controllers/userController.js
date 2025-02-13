const User = require("../models/User");
const bcrypt = require("bcryptjs");

// ✅ Register (Sign Up)
const registerUser = async (req, res) => {
    const { name, email, password, role } = req.body;

    // Ensure role is either 'student' or 'tutor' (No admin registration)
    if (!["student", "tutor"].includes(role)) {
        return res.status(400).json({ message: "Invalid role selection" });
    }

    try {
        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ message: "User already exists" });

        const user = await User.create({ name, email, password, role });
        res.status(201).json({ message: "User registered successfully", user });
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
};

// ✅ Login (Sign In)
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "User not found" });

        const isMatch = await user.matchPassword(password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        res.status(200).json({ message: "Login successful", user });
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
};

// ✅ Logout (Sign Out)
const logoutUser = (req, res) => {
    res.status(200).json({ message: "Logout successful" });
};

// ✅ Modify Account (Update User)
const updateUser = async (req, res) => {
    const { name, email, role } = req.body;

    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        user.name = name || user.name;
        user.email = email || user.email;
        if (role && ["student", "tutor"].includes(role)) {
            user.role = role;
        }

        await user.save();
        res.status(200).json({ message: "User updated successfully", user });
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
};

// ✅ Delete Account
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

// ✅ Activate / Deactivate Account
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

module.exports = { registerUser, loginUser, logoutUser, updateUser, deleteUser, toggleUserStatus };
