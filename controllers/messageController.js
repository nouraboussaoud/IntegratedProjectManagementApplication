const Message = require("../models/Message");
const User = require("../models/User");

// Send a message to another user
const sendMessage = async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    const senderId = req.userId; // From verifyToken middleware
    
    console.log("Attempting to send message:");
    console.log("Sender ID:", senderId);
    console.log("Receiver ID:", receiverId);
    console.log("Content:", content);
    
    // Check if receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      console.log(`Receiver with ID ${receiverId} not found in database`);
      return res.status(404).json({ message: "Receiver not found" });
    }
    
    // Check if sender exists
    const sender = await User.findById(senderId);
    if (!sender) {
      return res.status(404).json({ message: "Sender not found" });
    }
    
    // Check if receiver is banned
    if (receiver.isBanned) {
      return res.status(403).json({ message: "Cannot send message to banned user" });
    }
    
    // Create and save the message
    const message = new Message({
      sender: senderId,
      receiver: receiverId,
      content,
      // If there are files, add them as attachments
      attachments: req.files ? req.files.map(file => ({
        filename: file.originalname,
        path: file.path,
        mimetype: file.mimetype
      })) : []
    });
    
    await message.save();
    
    // Populate sender and receiver info for the socket event
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name email profilePic')
      .populate('receiver', 'name email profilePic');
    
    // Emit socket event (this will be handled in socketServer.js)
    req.app.get('io').to(receiverId.toString()).emit('new_message', populatedMessage);
    
    res.status(201).json({ 
      message: "Message sent successfully", 
      data: populatedMessage 
    });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all messages for the current user
const getMyMessages = async (req, res) => {
  try {
    const userId = req.userId; // From verifyToken middleware
    
    // Find messages where the user is either sender or receiver
    const messages = await Message.find({
      $or: [
        { sender: userId },
        { receiver: userId }
      ]
    })
    .populate('sender', 'name email profilePic')
    .populate('receiver', 'name email profilePic')
    .sort({ createdAt: -1 }); // Sort by newest first
    
    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get conversation between two users
const getConversation = async (req, res) => {
  try {
    const userId = req.userId; // Current user
    const otherUserId = req.params.userId; // The user they're chatting with
    
    // Find messages between these two users
    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: otherUserId },
        { sender: otherUserId, receiver: userId }
      ]
    })
    .populate('sender', 'name email profilePic')
    .populate('receiver', 'name email profilePic')
    .sort({ createdAt: 1 }); // Sort by oldest first for conversation view
    
    res.json(messages);
  } catch (error) {
    console.error("Error fetching conversation:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get unread messages count
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.userId;
    
    // Count unread messages
    const count = await Message.countDocuments({
      receiver: userId,
      isRead: false
    });
    
    res.json({ unreadCount: count });
  } catch (error) {
    console.error("Error counting unread messages:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Mark message as read
const markAsRead = async (req, res) => {
  try {
    const messageId = req.params.messageId;
    const userId = req.userId;
    
    // Find the message
    const message = await Message.findById(messageId);
    
    // Check if message exists
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }
    
    // Check if the current user is the receiver
    if (message.receiver.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized to mark this message as read" });
    }
    
    // Mark as read
    message.isRead = true;
    await message.save();
    
    // Emit a socket event for read receipt
    req.app.get('io').to(message.sender.toString()).emit('message_read', {
      messageId: message._id,
      readBy: userId
    });
    
    res.json({ message: "Message marked as read", data: message });
  } catch (error) {
    console.error("Error marking message as read:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Mark all messages from a specific user as read
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.userId;
    const senderId = req.params.userId;
    
    // Find all unread messages from this sender to this user
    const messages = await Message.find({
      sender: senderId,
      receiver: userId,
      isRead: false
    });
    
    // Update all unread messages
    const result = await Message.updateMany(
      { sender: senderId, receiver: userId, isRead: false },
      { $set: { isRead: true } }
    );
    
    // If there were updates, emit socket events
    if (result.modifiedCount > 0) {
      const messageIds = messages.map(msg => msg._id);
      req.app.get('io').to(senderId).emit('messages_read', {
        messageIds,
        readBy: userId
      });
    }
    
    res.json({ 
      message: "Messages marked as read", 
      updatedCount: result.modifiedCount 
    });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete a message
const deleteMessage = async (req, res) => {
  try {
    const messageId = req.params.messageId;
    const userId = req.userId;
    
    // Find the message
    const message = await Message.findById(messageId);
    
    // Check if message exists
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }
    
    // Check if the current user is the sender or receiver
    if (message.sender.toString() !== userId && message.receiver.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized to delete this message" });
    }
    
    // Store recipient info for socket notification
    const recipientId = message.sender.toString() === userId 
      ? message.receiver.toString() 
      : message.sender.toString();
    
    // Delete the message
    await message.deleteOne();
    
    // Emit a socket event to notify the other user
    req.app.get('io').to(recipientId).emit('message_deleted', {
      messageId,
      deletedBy: userId
    });
    
    res.json({ message: "Message deleted successfully" });
  } catch (error) {
    console.error("Error deleting message:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all users the current user has conversations with
const getMessageContacts = async (req, res) => {
  try {
    const userId = req.userId;
    
    // Find all messages where user is sender or receiver
    const messages = await Message.find({
      $or: [
        { sender: userId },
        { receiver: userId }
      ]
    });
    
    // Extract unique user IDs
    const uniqueUserIds = [...new Set([
      ...messages.map(msg => msg.sender.toString()),
      ...messages.map(msg => msg.receiver.toString())
    ])].filter(id => id !== userId);
    
    // Get user details
    const contacts = await User.find(
      { _id: { $in: uniqueUserIds } },
      'name email profilePic role isActive'
    );
    
    res.json(contacts);
  } catch (error) {
    console.error("Error fetching contacts:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Handle user typing indicator
const userTyping = (io, socket, data) => {
  const { receiverId, isTyping } = data;
  
  // Emit to the specific receiver
  socket.to(receiverId).emit('user_typing', {
    userId: socket.userId,
    isTyping
  });
};

// Get online users
const getOnlineUsers = async (req, res) => {
  try {
    const io = req.app.get('io');
    const onlineUsers = Object.keys(io.sockets.adapter.rooms)
      .filter(room => mongoose.Types.ObjectId.isValid(room));
    
    res.json({ onlineUsers });
  } catch (error) {
    console.error("Error getting online users:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  sendMessage,
  getMyMessages,
  getConversation,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteMessage,
  getMessageContacts,
  userTyping,
  getOnlineUsers
};
