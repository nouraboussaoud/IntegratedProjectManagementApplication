const Message = require("../models/Message");
const User = require("../models/User");
const mongoose = require("mongoose");

// Get unread message counts grouped by sender
const getUnreadCountsBySender = async (req, res) => {
  try {
    const userId = req.userId;
    
    // Aggregate to count unread messages grouped by sender
    const unreadCounts = await Message.aggregate([
      {
        $match: {
          receiver: new mongoose.Types.ObjectId(userId),
          isRead: false
        }
      },
      {
        $group: {
          _id: "$sender",
          count: { $sum: 1 }
        }
      }
    ]);
    
    const countsObject = unreadCounts.reduce((acc, item) => {
      acc[item._id.toString()] = item.count;
      return acc;
    }, {});
    
    res.json({ counts: countsObject });
  } catch (error) {
    console.error("Error counting unread messages by sender:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
const getAllConversations = async (req, res) => {
  try {
    const userId = req.userId;
    console.log("aaaa",userId);

    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [{ sender: new mongoose.Types.ObjectId(userId) }, { receiver: new mongoose.Types.ObjectId(userId) }]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: {
              if: { $gt: ["$sender", "$receiver"] },
              then: ["$sender", "$receiver"],
              else: ["$receiver", "$sender"]
            }
          },
          latestMessage: { $first: "$$ROOT" }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "latestMessage.sender",
          foreignField: "_id",
          as: "sender"
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "latestMessage.receiver",
          foreignField: "_id",
          as: "receiver"
        }
      },
      {
        $project: {
          _id: 0,
          latestMessage: {
            content: 1,
            createdAt: 1
          },
          sender: { $arrayElemAt: ["$sender", 0] }, // Ensure sender is an object
          receiver: { $arrayElemAt: ["$receiver", 0] } // Ensure receiver is an object
        }
      }
    ]);
    

    res.status(200).json(conversations);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ message: "Server error" });
  }
};
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

    // Log roles for debugging
    console.log("Sender role:", sender.role);
    console.log("Receiver role:", receiver.role);

    // Check if receiver is banned
    if (receiver.isBanned) {
      return res.status(403).json({ message: "Cannot send message to banned user" });
    }

    // Remove any role-based restrictions that might be causing the issue
    // Allow any user to message any other user regardless of role
    
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
      .populate('sender', 'name email profilePic role')
      .populate('receiver', 'name email profilePic role');

    // Get the io instance
    const io = req.app.get('io');
    
    // Emit to receiver's room for notification
    io.to(receiverId.toString()).emit('new_message', populatedMessage);
    
    // Also emit to sender's room for multi-device sync
    io.to(senderId.toString()).emit('new_message', populatedMessage);
    
    // Broadcast to anyone who might be viewing the conversation
    io.emit('message_sent', {
      senderId,
      receiverId,
      messageId: message._id
    });

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
// Get online users
const getOnlineUsers = async (req, res) => {
  try {
    const io = req.app.get('io');
    // Using newer approach to validate ObjectIds
    const onlineUsers = Object.keys(io.sockets.adapter.rooms)
      .filter(room => {
        // Check if the string matches ObjectId pattern
        return /^[0-9a-fA-F]{24}$/.test(room);
      });
    
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
  getOnlineUsers,
  getAllConversations,
  getUnreadCountsBySender  
};
