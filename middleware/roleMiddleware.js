const User = require('../models/User');

const isAdmin = async (req, res, next) => {
  try {
      console.log('Authenticating user:', req.user);  // Debugging log

      if (!req.user || !req.user.id) {
          console.log('No user authenticated');  // Debugging log
          return res.status(401).json({ message: 'No user authenticated' });
      }

      const user = await User.findById(req.user.id);
      console.log('Found user:', user);  // Debugging log

      if (!user) {
          console.log('User not found');  // Debugging log
          return res.status(404).json({ message: 'User not found' });
      }

      if (user.role !== 'admin') {
          console.log('Access denied. Admins only.');  // Debugging log
          return res.status(403).json({ message: 'Access denied. Admins only.' });
      }

      next();
  } catch (error) {
      console.error('Error in isAdmin middleware:', error);  // Detailed error logging
      return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { isAdmin };
