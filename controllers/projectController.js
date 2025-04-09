const User = require("../models/User");
const Group = require("../models/Group");
const Project = require("../models/Project");
const mongoose = require('mongoose');

// Get all projects
const getAllProjects = async (req, res) => {
  try {
    const projects = await Project.find(); // Get all projects
    res.status(200).json(projects);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


// Get a specific project by ID
const getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id); // Find project by ID

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.status(200).json(project);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
const getProjectByName = async (req, res) => {
  try {
    const project = await Project.findOne({ name: req.params.name }); // Find project by name

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.status(200).json(project);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}
////////////////////create project by nour

const createProject = async (req, res) => {
  try {
    // Ensure the user who creates the project is authenticated
    const userId = req.userId;  // User info from JWT token
    
    const { name, description, group, tasks } = req.body;

    const project = new Project({
      name,
      description,
      group,
      tasks,
      createdBy: userId,  // Assign user who created the project
    });

    await project.save();
    res.status(201).json(project);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
// Update project by ID
const updateProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id); // Find the project by ID

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Update the project fields
    const { name, description, group, tasks } = req.body;

    if (name) project.name = name;
    if (description) project.description = description;
    if (group) project.group = group;
    if (tasks) project.tasks = tasks;

    await project.save(); // Save the updated project
    res.status(200).json(project);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete project by ID
const deleteProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id); // Delete the project by ID

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.status(200).json({ message: "Project deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// The calculateProjectProgress function
const calculateProjectProgress = async (req, res) => {
  try {
    const projectId = req.params.id;

    // Get project by ID and populate its tasks
    const project = await Project.findById(projectId).populate("tasks");

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const tasks = project.tasks;
    console.log("Project tasks:", tasks.map(t => ({ id: t._id, status: t.status })));


    if (tasks.length === 0) {
      return res.status(200).json({ progress: 0 });
    }

    let totalProgress = 0;

    tasks.forEach((task) => {
      if (task.status === "pending") {
        totalProgress += 0;
      } else if (task.status === "in-progress") {
        totalProgress += 50;
      } else if (task.status === "completed") {
        totalProgress += 100;
      }
    });

    const progress = totalProgress / tasks.length;

    return res.status(200).json({ progress: progress.toFixed(2) }); // returns something like 62.50
  } catch (error) {
    console.error("Error calculating progress:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};



module.exports = {
  
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject,
  calculateProjectProgress,
  getProjectByName,
 
};


