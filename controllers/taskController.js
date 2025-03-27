const User = require("../models/User");
const Group = require("../models/Group");
const Project = require("../models/Project");
const Task = require("../models/Task");
const mongoose = require('mongoose');
const fetch = require('node-fetch');


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
    if (task) {
      res.json(task);
    } else {
      res.status(404).json({ message: "Task not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTaskByName = async (req, res) => {
  try {
    const task = await Task.findOne({ name: req.params.name });
    if (task) {
      res.json(task);
    } else {
      res.status(404).json({ message: "Task not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTaskByProject = async (req, res) => {
  try {
    const tasks = await Task.find({ project: req.params.id });
    if (tasks.length > 0) {
      res.json(tasks);
    } else {
      res.status(404).json({ message: "No tasks found for this project" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTaskByUser = async (req, res) => {
  try {
    const tasks = await Task.find({ assignedTo: req.params.id });
    if (tasks.length > 0) {
      res.json(tasks);
    } else {
      res.status(404).json({ message: "No tasks found for this user" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTaskByPriority = async (req, res) => {
  try {
    const tasks = await Task.find({ priority: req.params.priority });
    if (tasks.length > 0) {
      res.json(tasks);
    } else {
      res.status(404).json({ message: "No tasks found with this priority" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Function to create a new task and assign it to a project by its id. 
// It will automatically be added to the tasks list of the project
const createTask = async (req, res) => {
  try {
    const { title, description, project, priority } = req.body; // Remove assignedTo

    console.log("Received project ID:", project); // Debugging Log

    // Validate project existence
    const foundProject = await Project.findById(project);
    if (!foundProject) {
      console.log("Project not found in the database!"); // Debugging Log
      return res.status(404).json({ message: "Project not found" });
    }

    console.log("Project found:", foundProject);

    // Extract assigned user from JWT token
    const assignedTo = req.userId; // Authenticated user

    // Create new task
    const newTask = new Task({
      title,
      description,
      status: "pending", // Explicitly set status
      project,
      assignedTo, // Assigned automatically from JWT token
      priority,
      progressPercentage: 0, // Initial progress set to 0%
      timeSpent: 0, // Track time spent
    });

    await newTask.save();

    foundProject.tasks.push(newTask._id);
    await foundProject.save();

    res.status(201).json({
      message: "Task created successfully!",
      task: newTask,
    });
  } catch (error) {
    console.error("Error creating task:", error);
    res.status(500).json({ message: error.message });
  }
};


const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (task) {
      task.title = req.body.title || task.title;
      task.description = req.body.description || task.description;
      task.status = req.body.status || task.status;
      task.project = req.body.project || task.project;
      task.assignedTo = req.body.assignedTo || task.assignedTo;
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
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: "Task deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const setTaskPending = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (task) {
      task.status = "pending";
      await task.save();
      res.json(task);
    } else {
      res.status(404).json({ message: "Task not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const setTaskInProgress = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (task) {
      task.status = "in-progress";
      await task.save();
      res.json(task);
    } else {
      res.status(404).json({ message: "Task not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const setTaskCompleted = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (task) {
      task.status = "completed";
      await task.save();
      res.json(task);
    } else {
      res.status(404).json({ message: "Task not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const assignTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (task) {
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
const updateTaskProgress = async (req, res) => {
  try {
    const { id } = req.params; // Using 'id' instead of 'taskId'
    const { progressPercentage, status, timeSpent } = req.body;

    console.log('Received taskId:', id);

    // Check if taskId is valid
    const { ObjectId } = require('mongoose').Types;
    if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid task ID format" });
    }

    // Search for the task
    const task = await Task.findById(id);
    console.log('Task found:', task);

    if (!task) {
        return res.status(404).json({ message: "Task not found" });
    }

    // 🔒 Ensure only the assigned user can update the task
    if (task.assignedTo.toString() !== req.userId) {
        return res.status(403).json({ message: "Unauthorized: You are not assigned to this task" });
    }

    // 🔍 Validate progress percentage (0-100)
    if (progressPercentage !== undefined) {
        if (progressPercentage < 0 || progressPercentage > 100) {
            return res.status(400).json({ message: "Progress must be between 0 and 100%" });
        }
        task.progressPercentage = progressPercentage;
    }

    // ✅ Update status & set completion date if necessary
    if (status) {
        task.status = status;
        if (status === "completed") {
            task.completedOn = new Date();
            task.progressPercentage = 100; // Auto-set progress to 100% if completed
        }
    }

    // 📅 Ensure timeSpent is not negative
    if (timeSpent !== undefined) {
        if (timeSpent < 0) {
            return res.status(400).json({ message: "Time spent cannot be negative" });
        }
        task.timeSpent += timeSpent; // Increment time spent
    }

    await task.save();
    res.status(200).json({ message: "Task updated successfully", task });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getTaskWithProgress = async (req, res) => {
  try {
      const status = req.query.status || "pending";  // optional status filter
      const tasks = await Task.find({ 
          assignedTo: req.userId, 
          status: { $regex: status, $options: 'i' } // case-insensitive search
      }).populate('assignedTo');
      res.status(200).json(tasks);
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
  }
};


// ✅ Fetch GitHub commits and update task progress
const fetchAllCommits = async (url, token) => {
  let commits = [];
  let currentUrl = url;

  while (currentUrl) {
    const response = await fetch(currentUrl, {
      headers: {
        Authorization: `token ${token}`,
      },
    });

    if (!response.ok) {
      console.error(`GitHub API error: ${response.statusText}`);
      break;
    }

    try {
      const data = await response.json();
      commits = commits.concat(data);

      // Handle pagination
      const linkHeader = response.headers.get("Link");
      if (linkHeader) {
        const nextLink = linkHeader.split(",").find(link => link.includes('rel="next"'));
        currentUrl = nextLink ? nextLink.split(";")[0].trim().slice(1, -1) : null;
      } else {
        currentUrl = null;
      }
    } catch (error) {
      console.error("Error parsing GitHub response:", error);
      break;
    }
  }

  return commits;
};

const trackGitHubCommits = async (req, res) => {
  try {
    const { taskId, repoOwner, repoName, branchName } = req.params;

    // Fetch the task from the database
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/commits?sha=${branchName}`;

    // Check if GitHub API rate limit is exceeded
    const rateLimitResponse = await fetch("https://api.github.com/rate_limit", {
      headers: { Authorization: `token ${GITHUB_TOKEN}` },
    });

    if (!rateLimitResponse.ok) {
      return res.status(500).json({ message: "Error checking GitHub rate limit" });
    }

    const rateLimitData = await rateLimitResponse.json();
    if (rateLimitData.resources.core.remaining === 0) {
      return res.status(429).json({ message: "GitHub API rate limit exceeded" });
    }

    // Fetch all commits
    const commits = await fetchAllCommits(apiUrl, GITHUB_TOKEN);
    if (commits.length === 0) {
      return res.status(404).json({ message: "No commits found" });
    }

    console.log("Total commits fetched:", commits.length);

    // Update task progress
    const commitCount = commits.length;
    task.progressPercentage = Math.min(100, commitCount * 10); // Example: 10% per commit

    // Save updated task
    await task.save();

    // Send response
    res.status(200).json({
      message: "Task updated with commit data",
      task,
      commitCount,
    });

  } catch (error) {
    console.error("Error fetching GitHub commits:", error);
    res.status(500).json({ message: "Error fetching GitHub commits", error: error.message });
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
  updateTaskProgress,
  getTaskWithProgress,
  trackGitHubCommits,
  fetchAllCommits,
};
