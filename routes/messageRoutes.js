const express = require("express");
const router = express.Router();
const { verifyToken } = require("../controllers/userController");
const { 
  sendMessage, 
  getMyMessages, 
  getConversation,
  getUnreadCount,
  markAsRead,
  markAllAsRead, 
  deleteMessage,
  getMessageContacts,
  getOnlineUsers,
  getAllConversations
} = require("../controllers/messageController");
const { upload } = require("../uploadimage");
const { authenticateUser } = require("../middleware/authMiddleware");


// All routes are protected with verifyToken
router.post('/send', verifyToken, upload.array('attachments', 5), sendMessage);
router.get('/my-messages', verifyToken, getMyMessages);
router.get('/conversation/:userId', verifyToken, getConversation);
router.get('/unread-count', verifyToken, getUnreadCount);
router.put('/mark-read/:messageId', verifyToken, markAsRead);
router.put('/mark-all-read/:userId', verifyToken, markAllAsRead);
router.delete('/delete/:messageId', verifyToken, deleteMessage);
router.get('/contacts', verifyToken, getMessageContacts);
router.get('/online-users', verifyToken, getOnlineUsers);
router.get("/conversations", verifyToken, getAllConversations);


module.exports = router;