const Project = require('../models/Project');
const Group = require('../models/Group');
const User = require('../models/User');
const { emitToGroup, emitToUser } = require('../socket/socketServer');

// Lorsque l'utilisateur lance un appel vidéo
exports.startVideoCall = async (req, res) => {
    try {
      const projectId = req.params.id;
      const userId = req.userId;
  
      const project = await Project.findById(projectId).populate('group');
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
  
      const group = await Group.findById(project.group._id).populate('members');
      if (!Array.isArray(group.members)) {
        return res.status(500).json({ message: "Group members data is invalid" });
      }
  
      // Vérifier que l'utilisateur fait bien partie du groupe
      if (!group.members.some(m => m._id.equals(userId))) {
        return res.status(403).json({ message: "Not authorized to start call for this project" });
      }
  
      const roomName = `project-${projectId}-${Date.now()}`;
  
      // Préparer l'invitation
      const notification = {
        type: 'VIDEO_CALL_INVITATION',
        from: userId,
        projectId: project._id,
        projectName: project.name,
        roomName,
        timestamp: new Date()
      };
  
      // Émettre à tous les membres sauf l'initiateur de l'appel
      group.members.forEach(member => {
        if (!member._id.equals(userId)) {
          emitToUser(member._id.toString(), 'video-call-invitation', notification);
        }
      });
  
      res.status(200).json({ message: "Call started successfully", roomName });
    } catch (error) {
      console.error("Error starting video call:", error);
      res.status(500).json({ message: "Server error" });
    }
  };
  
  

exports.respondToVideoCall = async (req, res) => {
    try {
        const { response, roomName, from } = req.body; // 'accept' or 'decline'
        const userId = req.userId;
        const projectId = req.params.id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const project = await Project.findById(projectId).populate('group');
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        // Send response via WebSocket
        const responseNotification = {
            type: 'VIDEO_CALL_RESPONSE',
            from: userId,
            userName: user.name,
            projectId,
            response,
            roomName,
            timestamp: new Date()
        };

        emitToGroup(project.group._id.toString(), 'video-call-response', responseNotification);

        res.status(200).json({ 
            message: `Call ${response}ed successfully`,
            responseNotification
        });

    } catch (error) {
        console.error("Error responding to video call:", error);
        res.status(500).json({ message: "Server error" });
    }
};

exports.inviteToVideoCall = async (req, res) => {
    try {
      const { roomName, projectId, userIds } = req.body;
      const callerId = req.userId;
      
      console.log(`📞 Caller ${callerId} inviting to call in project ${projectId}`);
  
      // Validate required fields
      if (!roomName || !projectId || !userIds) {
        return res.status(400).json({ 
          success: false, 
          message: "Missing required fields" 
        });
      }
  
      // Get caller details
      const caller = await User.findById(callerId).select('name');
      if (!caller) {
        return res.status(404).json({ message: "Caller not found" });
      }
  
      // Get project details
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
  
      // Prepare notification payload
      const notification = {
        type: 'VIDEO_CALL_INVITATION',
        from: callerId,
        callerName: caller.name,
        projectId: project._id,
        projectName: project.name,
        roomName,
        timestamp: new Date()
      };
  
      // Send to each user individually
      const io = req.app.get('io');
      userIds.forEach(userId => {
        console.log(`📤 Sending notification to user ${userId}`);
        io.to(userId).emit('video-call-invitation', notification);
      });
  
      res.status(200).json({ 
        success: true,
        message: "Invitations sent",
        notification
      });
  
    } catch (error) {
      console.error("Error in inviteToVideoCall:", error);
      res.status(500).json({ 
        success: false, 
        message: "Server error",
        error: error.message 
      });
    }
  };