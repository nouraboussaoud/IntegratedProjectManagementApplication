const User = require("../models/User");
const Group = require("../models/Group");
const Project = require("../models/Project");
const Task = require("../models/Task");
const mongoose = require('mongoose');

const getAllTasks = async (req, res) => {
  try {
    const tasks = await Task.find();
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTaskByName = async (req, res) => {
  try {
    const task = await Task.findOne({ name: req.params.name });
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTaskByProject = async (req, res) => {
  try {
    const tasks = await Task.find({ project: req.params.id } || { project: req.params.name });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTaskByUser = async (req, res) => {
  try {
    const tasks = await Task.find({ assignedTo: req.params.id } || { assignedTo: req.params.name });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTaskByPriority = async (req, res) => {
  try {
    const tasks = await Task.find({ priority: req.params.priority });
    res.json(tasks);   
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

//Function to create a new task and assign it to a project by its id. 
//It will automatically be added to the tasks list of the group
const createTask = async (req, res) => {
  try {
    const task = new Task(req.body);
    const project = await Project.findById(req.params.id);
    task.project = await Project.findById(req.params.id);
    project.tasks.push(task);
    await task.save();
    await project.save();
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (task) {
      task.title = req.body.title;
      task.description = req.body.description;
      task.status = req.body.status;
      task.project = req.body.project;
      task.assignedTo = req.body.assignedTo;
      await task.save();
      res.json(task);
    } else {
      res.status(404).json({ message: "Task not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteTask = async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: "Task deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const setTaskPending = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    task.status = "pending";
    await task.save();
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const setTaskInProgress = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    task.status = "in-progress";
    await task.save();
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const setTaskCompleted = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    task.status = "completed";
    await task.save();
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const assignTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    task.assignedTo = req.body.assignedTo;
    await task.save();
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const sortTasksByPriority = async (req, res) => {
    try {
      const priorityMapping = {
        low: 1,
        medium: 2,
        high: 3,
        urgent: 4,
      };
      const tasks = await Task.find();
      tasks.sort((a, b) => priorityMapping[b.priority] - priorityMapping[a.priority]);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };


module.exports = {
  getAllTasks,
  getTaskById,
  getTaskByName,
  getTaskByProject,
  getTaskByUser,
  getTaskByPriority,
  createTask,
  updateTask,
  deleteTask,
  setTaskPending,
  setTaskInProgress,
  setTaskCompleted,
  assignTask,
  sortTasksByPriority,
};
