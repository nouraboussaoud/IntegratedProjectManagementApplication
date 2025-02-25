const User = require("../models/User");
const Group = require("../models/Group");
const Project = require("../models/Project");
const mongoose = require('mongoose');

const getAllProjects = async (req, res) => {
  try {
    const projects = await Project.find();
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProjectByName = async (req, res) => {
  try {
    const project = await Project.findOne({ name: req.params.name });
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProjectByGroup = async (req, res) => {
    try {
        const projects = await Project.find({ group: req.params.id } || { group: req.params.name });
        res.json(projects);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getProjectTasks = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).populate("tasks");
    res.json(project.tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProjectFinishedTasks = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).populate("tasks");
    const finishedTasks = project.tasks.filter(task => task.status === 'completed');
    res.json(finishedTasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProjectPendingTasks = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id).populate("tasks");
        const pendingTasks = project.tasks.filter(task => task.status === 'pending');
        res.json(pendingTasks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getProjectInProgressTasks = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id).populate("tasks");
        const inProgressTasks = project.tasks.filter(task => task.status === 'in-progress');
        res.json(inProgressTasks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createProject = async (req, res) => {
  try {
    const project = new Project(req.body);
    await project.save();
    res.status(201).json(project);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateProject = async (req, res) => {
    try {
      const project = await Project.findById(req.params.id);
      if (req.body.name) {
        project.name = req.body.name;
      }
      if (req.body.description) {
        project.description = req.body.description;
      }
      if (req.body.group) {
        project.group = req.body.group;
      }
      if (req.body.tasks) {
        project.tasks = req.body.tasks;
      }
      if (req.body.createdBy) {
        project.createdBy = req.body.createdBy;
      }
      await project.save();
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }  
};

const deleteProject = async (req, res) => {
  try {
    await Project.findByIdAndDelete(req.params.id);
    res.json({ message: "Project deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addTask = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    project.tasks.push(req.body.taskId);
    await project.save();
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const assignProjectToGroup = async (req, res) => {
    try {
      const project = await Project.findById(req.params.id);
      const group = await Group.findById(req
        .body.groupId);
      project.group = group;
      await project.save();
      res.json(project);
    }
    catch (error) {
      res.status(500).json({ message: error.message });
    }
  };

module.exports = {
  getAllProjects,
  getProjectById,
  getProjectByName,
  getProjectByGroup,
  getProjectTasks,
  getProjectFinishedTasks,
  getProjectPendingTasks,
  getProjectInProgressTasks,
  createProject,
  updateProject,
  deleteProject,
  addTask,
  assignProjectToGroup
};


