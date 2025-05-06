const jwt = require('jsonwebtoken');
const User = require('../models/User');

const secretKey = process.env.JWT_SECRET_KEY || 'your_super_secret_key';
let ioInstance = null;//douaa
// Initialize socket server
const initializeSocketServer = (server) => {
  const io = require('socket.io')(server, {
    cors: {
      origin:  "*",
      methods: ['GET', 'POST'],
      credentials: true
    }
  });
  

  // Middleware to authenticate socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query.auth;
      
      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }
      
      // Verify token
      const decoded = jwt.verify(token, secretKey);
      socket.userId = decoded.userId;
      
      // Check if user exists and is not banned
      const user = await User.findById(decoded.userId);
      if (!user || user.isBanned) {
        return next(new Error('Authentication error: User not found or banned'));
      }
      
      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication error: Invalid token'));
    }
  });
  
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId}`);
    
    // Join a room with their user ID to receive private messages
    socket.join(socket.userId);
    
    // Emit online status to all users
    io.emit('user_status_changed', {
      userId: socket.userId,
      status: 'online'
    });
    
    // Handle typing indicator
    socket.on('typing', (data) => {
      const { receiverId, isTyping } = data;
      socket.to(receiverId).emit('user_typing', {
        userId: socket.userId,
        isTyping
      });
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
      io.emit('user_status_changed', {
        userId: socket.userId,
        status: 'offline'
      });
    });
  });
  
  return io;
};
const emitToGroup = (groupId, event, data) => {
  if (!ioInstance) {
      console.error('Socket.IO instance not initialized');
      return;
  }
  ioInstance.to(`group-${groupId}`).emit(event, data);
};

const emitToUser = (userId, event, data) => {
  if (!ioInstance) {
      console.error('Socket.IO instance not initialized');
      return;
  }
  ioInstance.to(userId).emit(event, data);
};
module.exports = { initializeSocketServer,  emitToGroup ,emitToUser};