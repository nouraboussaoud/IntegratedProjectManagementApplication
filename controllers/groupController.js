require('dotenv').config();
const nodemailer = require('nodemailer');

const User = require("../models/User");
const Group = require("../models/Group");
const mongoose = require('mongoose');



// Configurer le transporteur de mails avec Nodemailer
// Setup mail transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'aboussaoudnour436@gmail.com', // Update with your email
        pass: process.env.MAIL_PASSWORD // Update with your email password (use environment variables for security in production)
    }
});

const sendInvitationEmail = async (userEmail, groupName, userId) => {
  // Génération du token pour l'utilisateur (ajoutez votre logique pour créer un token ici)
  const user = await User.findOne({ email: userEmail });

  // Extraire le nom de l'utilisateur
  const userName = user ? user.name : 'User'; 
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: userEmail,
    subject: `🎉 Invitation to Join the Group: ${groupName} 🎉`,
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px; text-align: center; color: #333;">
        <h2 style="color: #2d87f0;">You’re Invited! 🌟</h2>
        <p style="font-size: 18px; line-height: 1.6;">
          Hello <strong>${userName}</strong>,
        </p>
        <p style="font-size: 18px; line-height: 1.6;">
          You’ve been invited to join the <strong style="color: #2d87f0;">${groupName}</strong> group! 🎉
        </p>
        <p style="font-size: 18px; line-height: 1.6;">
          This is your chance to be a part of something exciting and impactful! 🚀 Whether you’re looking to learn, collaborate, or grow, this group is the perfect place to make things happen.
        </p>
        <p style="font-size: 18px; line-height: 1.6;">
          Ready to join the fun? Simply <a href="http://localhost:3000/login" style="color: #2d87f0; text-decoration: none;">log in here</a> and choose whether you’d like to <a href="http://localhost:3000/InvitationList" style="color: #2d87f0; text-decoration: none;">accept</a> or <a href="http://localhost:3000/InvitationList" style="color: #d9534f; text-decoration: none;">reject</a> the invitation.
        </p>
        <p style="font-size: 18px; line-height: 1.6;">
          We can’t wait to see what you bring to the table in ${groupName}! 💡
        </p>
        <p style="font-size: 18px; line-height: 1.6; font-weight: bold;">
          Best regards, <br>
          The ${groupName} Team 🚀
        </p>
        <footer style="font-size: 14px; color: #888;">
          <p>You're receiving this email because you were invited to join the group ${groupName}. If you have any questions, feel free to reach out to us!</p>
        </footer>
      </div>
    `,
  };

  try {
    console.log(`Sending email to: ${userEmail}`);
    await transporter.sendMail(mailOptions);  // Envoi du mail avec le lien d'invitation
    console.log('Invitation sent to', userEmail);
  } catch (error) {
    console.error('Error sending email:', error);
  }
};









const getAllGroups = async (req, res) => {
  try {
    const groups = await Group.find()
      .populate({
        path: 'members',
        select: 'name skills'
      })
      .populate({
        path: 'assignedSubjects',
        select: 'title description'
      });
    
    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getGroupById = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    res.json(group);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getGroupByName = async (req, res) => {
  try {
    const group = await Group.findOne({ name: req.params.name });
    res.json(group);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getGroupMembers = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id).populate("members");
    res.json(group.members);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const createGroup = async (req, res) => {
  try {
    console.log("Received request to create a group:", req.body);

    const group = new Group(req.body);
    await group.save();
    console.log("Group created:", group);

    const selectedMembers = req.body.members;
    console.log("Selected members:", selectedMembers);

    const emailPromises = selectedMembers.map(async (userId) => {
      const user = await User.findById(userId);
      if (!user) {
        console.error(`User with ID ${userId} not found.`);
        return;
      }

      console.log(`Sending email to: ${user.email}`);
      if (user.email) {
        await sendInvitationEmail(user.email, group.name, group._id);
      } else {
        console.warn(`User with ID ${userId} does not have an email.`);
      }
    });

    await Promise.all(emailPromises);
    res.status(201).json(group);
  } catch (error) {
    console.error("Error during group creation:", error);
    
    // Gestion spécifique pour les erreurs de duplication
    if (error.code === 11000 && error.keyPattern && error.keyPattern.name) {
      return res.status(400).json({ 
        message: "Group name already exists. Please choose a different name." 
      });
    }
    
    res.status(400).json({ 
      message: "Group name already exists. Please choose a different name." 
    });
  }
};







const updateGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    // Vérifier si le nouveau nom existe déjà pour un autre groupe
    if (name) {
      const existingGroup = await Group.findOne({ 
        name: name,
        _id: { $ne: id } // Exclure le groupe actuel de la recherche
      });

      if (existingGroup) {
        return res.status(400).json({ 
          message: "Group name already exists. Please choose a different name." 
        });
      }
    }

    // Mettre à jour le groupe
    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (name) group.name = name;
    if (req.body.members) group.members = req.body.members;

    await group.save();
    res.json(group);
  } catch (error) {
    console.error("Error updating group:", error);
    res.status(500).json({ 
      message: error.message || "An error occurred while updating the group" 
    });
  }
};

const deleteGroup = async (req, res) => {
  try {
    await Group.findByIdAndDelete(req.params.id);
    res.json({ message: "Group deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 

const addMember = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    const user = await User
      .findOne({ email: req.body.email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    group.members.push(user._id);
    await group.save();
    res.json(group);
  } catch (error) {
    res.status(500).json({ message: error.message });
  } 
};

const deleteMember = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    const user = await User
      .findOne({ email: req.body.email  } || { name: req.body.name});
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    group.members.pull(user._id);
    await group.save(); 
    res.json(group);
    }
    catch (error) {
      res.status(500).json({ message: error.message });
    }
};


const getMyGroups = async (req, res) => {
  try {
    const userId = req.userId;  // Utiliser req.userId extrait du token
    console.log("User ID from token:", userId); // Vérifie que l'ID est bien extrait

    if (!userId) {
      return res.status(400).json({ message: "User ID missing in token" });
    }

    // Recherche des groupes où l'utilisateur est soit membre, soit administrateur
    const groups = await Group.find({
      members: userId,
      acceptedMembers: { $ne: userId }
    }).populate('members', 'name email');// Seulement peupler les membres

    res.json(groups);  // Retourner les groupes

  } catch (error) {
    console.error("Error fetching groups:", error);  // Log de l'erreur
    res.status(500).json({ message: "An error occurred while fetching groups" });
  }
};
const getMyGroupss = async (req, res) => {
  try {
    const userId = req.userId;  // Utiliser req.userId extrait du token
    console.log("User ID from token:", userId); // Vérifie que l'ID est bien extrait

    if (!userId) {
      return res.status(400).json({ message: "User ID missing in token" });
    }

    // Recherche des groupes où l'utilisateur est soit membre, soit administrateur
    const groups = await Group.find({
      members: userId,
    
    }).populate('members', 'name email');// Seulement peupler les membres

    res.json(groups);  // Retourner les groupes

  } catch (error) {
    console.error("Error fetching groups:", error);  // Log de l'erreur
    res.status(500).json({ message: "An error occurred while fetching groups" });
  }
};

const rejectInvitation = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.userId; // L'ID de l'utilisateur connecté (extraite du token)

    // 1. Trouver le groupe
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // 2. Vérifier si l'utilisateur est bien dans le groupe
    const isMember = group.members.includes(userId);
    if (!isMember) {
      return res.status(400).json({ message: "User is not a member of this group" });
    }

    // 3. Supprimer l'utilisateur du groupe
    group.members.pull(userId);
    await group.save();

    res.status(200).json({ 
      message: "Invitation rejected successfully",
      group 
    });

  } catch (error) {
    console.error("Error rejecting invitation:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
const checkGroupName = async (req, res) => {
  try {
    const group = await Group.findOne({ name: req.query.name });
    res.json({ exists: !!group });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// Dans votre contrôleur de groupes (backend)
// Dans controllers/groupController.js
const getAllGroupsForDropdown = async (req, res) => {
  try {
    const groups = await Group.find()
      .select('name _id assignedSubjects') // Inclure les sujets assignés
      .populate({
        path: 'assignedSubjects',
        select: 'title _id' // Seulement le titre et l'ID
      });
    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const acceptInvitation = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.userId;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    // Vérifie si l'utilisateur est bien dans les membres
    if (!group.members.includes(userId)) {
      return res.status(400).json({ message: "User not in group members" });
    }

    // Ajoute à acceptedMembers si pas déjà présent
    if (!group.acceptedMembers.includes(userId)) {
      group.acceptedMembers.push(userId);
      await group.save();
    }

    res.status(200).json({ message: "Invitation accepted", group });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const getAttendanceByGroupId = async (req, res) => {
  try {
    const { groupId } = req.params;
    
    // Fetch attendance records for a specific group
    const attendanceRecords = await Attendance.find({ group: groupId })
                                              .populate('group', 'name')
                                              .populate('presentMembers', 'name email')
                                              .populate('absentMembers', 'name email')
                                              .sort('-sessionDate'); // Sort by date
    
    if (!attendanceRecords) {
      return res.status(404).json({ message: "No attendance records found for this group." });
    }
    
    res.status(200).json(attendanceRecords);
  } catch (error) {
    console.error("Error fetching attendance records:", error);
    res.status(500).json({ message: "Error fetching attendance records" });
  }
};
module.exports = {
  getAllGroups,
  getGroupById,
  getGroupByName,
  getGroupMembers,
  createGroup,
  updateGroup,
  deleteGroup,
  addMember,
  deleteMember, 
  getMyGroups,
  getMyGroupss,
  rejectInvitation, checkGroupName,getAllGroupsForDropdown,acceptInvitation,getAttendanceByGroupId
};