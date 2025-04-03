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
    const { title, description, project, priority, taskDetails } = req.body;
    
    console.log("Received project ID:", project);
    
    // Validate project existence
    const foundProject = await Project.findById(project);
    if (!foundProject) {
      console.log("Project not found in the database!");
      return res.status(404).json({ message: "Project not found" });
    }
    
    console.log("Project found:", foundProject);
    
    // Extract assigned user from JWT token
    const assignedTo = req.userId;
    
    // Créer la nouvelle tâche avec les détails
    const newTask = new Task({
      title,
      description,
      status: "pending",
      project,
      assignedTo,
      priority,
      progressPercentage: 0,
      timeSpent: 0,
      taskDetails: taskDetails || "" // Ajout des détails de tâche
    });
    
    await newTask.save();
    
    // Si des détails de tâche sont fournis, prédire le risque
    if (taskDetails) {
      try {
        // Appeler votre fonction de prédiction
        const riskPrediction = await predictTaskRisk(taskDetails);
        
        if (riskPrediction) {
          newTask.risk = riskPrediction.risk;
          newTask.riskConfidence = riskPrediction.confidence;
          await newTask.save();
        }
      } catch (predictionError) {
        console.error("Error predicting task risk:", predictionError);
        // Continuer malgré l'erreur de prédiction
      }
    }
    
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
//////////update

const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Vérifier si l'ID est valide
    const { ObjectId } = require('mongoose').Types;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid task ID format" });
    }
    
    // Chercher la tâche
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    
    // Vérifier si l'utilisateur a le droit de modifier cette tâche
    if (task.assignedTo.toString() !== req.userId) {
      return res.status(403).json({ message: "Unauthorized: You are not assigned to this task" });
    }
    
    // Vérifier si les détails de la tâche ont été modifiés
    const taskDetailsChanged = updates.taskDetails && updates.taskDetails !== task.taskDetails;
    
    // Appliquer les mises à jour
    Object.keys(updates).forEach((key) => {
      task[key] = updates[key];
    });
    
    // Si les détails ont changé, mettre à jour le risque
    if (taskDetailsChanged && updates.taskDetails) {
      try {
        const riskPrediction = await predictTaskRisk(updates.taskDetails);
        if (riskPrediction) {
          task.risk = riskPrediction.risk;
          task.riskConfidence = riskPrediction.confidence;
        }
      } catch (predictionError) {
        console.error("Error updating task risk:", predictionError);
        // Continuer malgré l'erreur de prédiction
      }
    }
    
    await task.save();
    res.status(200).json({ message: "Task updated successfully", task });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: "Server error", error: error.message });
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

    // ✅ Update progress percentage automatically if not provided
    if (progressPercentage === undefined) {
      // Example: You can calculate progress automatically based on timeSpent or other metrics
      if (task.totalEstimatedTime > 0) {
        task.progressPercentage = Math.min(100, (task.timeSpent / task.totalEstimatedTime) * 100); // Auto-calculate progress based on time spent
      }
    } else {
      // Validate the provided progress percentage (if provided)
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
    console.log("Rate Limit Response Status:", rateLimitResponse.status);  // Log the status

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

// Function to handle task risk prediction
// Fonction utilitaire pour prédire le risque
const predictTaskRisk = async (taskDetails) => {
  const HUGGING_FACE_API_KEY = process.env.HUGGING_FACE_API_KEY;
  
  if (!taskDetails) {
    return null;
  }
  
  try {
    // Appel à l'API Hugging Face pour la prédiction
    const response = await fetch("https://api-inference.huggingface.co/models/facebook/bart-large-mnli", {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HUGGING_FACE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: `Predict deadline risk based on: ${taskDetails}`,
        parameters: { candidate_labels: ["High Risk", "Low Risk"] },
      }),
    });
    
    const result = await response.json();
    console.log('Hugging Face response:', result);
    
    if (result && result.labels && result.scores && result.labels.length > 0) {
       // Trouver l'index du score le plus élevé
       const maxIndex = result.scores.indexOf(Math.max(...result.scores));
      
      return {
        risk: result.labels[maxIndex],
        confidence: result.scores[maxIndex],
      };
    }
    return null;
  } catch (error) {
    console.error('Error predicting risk:', error);
    return null;
  }
};


const predictRisk = async (req, res) => {
  const { taskId, taskDetails } = req.body;
  
  // Si un ID de tâche est fourni sans détails, utiliser les détails existants
  if (taskId && !taskDetails) {
    try {
      const task = await Task.findById(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      const result = await predictTaskRisk(task.taskDetails);
      if (!result) {
        return res.status(400).json({ message: "Unable to get a prediction from the model." });
      }
      
      // Mettre à jour la tâche avec la nouvelle prédiction
      task.risk = result.risk;
      task.riskConfidence = result.confidence;
      await task.save();
      
      return res.status(200).json({
        risk: result.risk,
        confidence: result.confidence,
        taskId: task._id
      });
    } catch (error) {
      console.error('Error predicting risk:', error);
      return res.status(500).json({ message: "Error predicting risk", error: error.message });
    }
  }
  
  // Si des détails sont fournis directement, faire une prédiction sans sauvegarder
  if (!taskDetails) {
    return res.status(400).json({ message: "Task details are required." });
  }
  
  try {
    const result = await predictTaskRisk(taskDetails);
    if (!result) {
      return res.status(400).json({ message: "Unable to get a prediction from the model." });
    }
    
    return res.status(200).json({
      risk: result.risk,
      confidence: result.confidence
    });
  } catch (error) {
    console.error('Error predicting risk:', error);
    return res.status(500).json({ message: "Error predicting risk", error: error.message });
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
  predictTaskRisk,
  predictRisk,
};
