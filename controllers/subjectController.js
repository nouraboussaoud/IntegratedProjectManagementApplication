const Subject = require("../models/subject");
const { assignSubjects } = require('../Utils/tfidfCalculator');
const Group = require("../models/Group");
const User = require("../models/User");
// Get all subjects
// Dans votre contrôleur (backend)
const getAllSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find().populate('assignedGroups', 'name members');
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a subject by ID
const getSubjectById = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) return res.status(404).json({ message: "Subject not found" });
    res.json(subject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createSubject = async (req, res) => {
    try {
      console.log("Received subject:", req.body);
      const subject = new Subject(req.body);
      await subject.save();
      res.status(201).json(subject);
    } catch (error) {
      console.error("Error creating subject:", error);
      res.status(400).json({ message: error.message });
    }
  };
  
  

// Update subject
const updateSubject = async (req, res) => {
  try {
    const subject = await Subject.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!subject) return res.status(404).json({ message: "Subject not found" });
    res.json(subject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete subject
const deleteSubject = async (req, res) => {
  try {
    const subject = await Subject.findByIdAndDelete(req.params.id);
    if (!subject) return res.status(404).json({ message: "Subject not found" });
    res.json({ message: "Subject deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
async function assignSubjectsToGroups(req, res) {
  try {
    const threshold = parseFloat(req.query.threshold) || 0.15;
    const maxGroups = parseInt(req.query.maxGroups) || 3;

    const [groups, subjects, users] = await Promise.all([
      Group.find().populate('members', 'name skills'),
      Subject.find(),
      User.find()
    ]);

    const { matches, message } = await assignSubjects(
      groups, 
      users, 
      subjects, 
      threshold, 
      maxGroups
    );

    // Retournez une structure cohérente
    res.status(200).json({
      success: true,
      message,
      assignments: matches || [], // Garantir un tableau vide
      stats: {
        totalGroups: groups.length,
        totalSubjects: subjects.length,
        totalUsers: users.length,
        threshold,
        maxGroups
      }
    });

  } catch (error) {
    console.error('Error in assignSubjectsToGroups:', error);
    res.status(500).json({ 
      success: false,
      message: "Erreur du système d'affectation",
      error: error.message,
      assignments: [] // Garantir un tableau vide
    });
  }
}
module.exports = {
  getAllSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
  assignSubjectsToGroups
};
