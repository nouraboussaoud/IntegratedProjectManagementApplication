const User = require('../models/User');

const isAdmin = async (req, res, next) => {
  try {
    // Log for debugging
    console.log('Authenticating user:', req.user);

    // Ensure the user is authenticated (req.user should be set by the token verification middleware)
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'No user authenticated' });
    }

    // Find the user by their ID
    const user = User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the user has the 'admin' role
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admins only.' });
    }

    // Proceed to the next middleware/route handler
    next();
  } catch (error) {
    console.error('Error in isAdmin middleware:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { isAdmin };
