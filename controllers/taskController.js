const User = require("../models/User");
const Group = require("../models/Group");
const Project = require("../models/Project");
const Task = require("../models/Task");
const mongoose = require('mongoose');
const fetch = require('node-fetch');

// Existing functions (unchanged, included for completeness)
const getAllTasks = async (req, res) => {
  try {
    const tasks = await Task.find();
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: "Error fetching tasks", error: error.message });
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
    res.status(500).json({ message: "Error fetching task", error: error.message });
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
    res.status(500).json({ message: "Error fetching task by name", error: error.message });
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
    res.status(500).json({ message: "Error fetching tasks by project", error: error.message });
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
    res.status(500).json({ message: "Error fetching tasks by user", error: error.message });
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
    res.status(500).json({ message: "Error fetching tasks by priority", error: error.message });
  }
};

const createTask = async (req, res) => {
  try {
    const { title, description, project, priority, taskDetails, repoOwner, repoName, branchName } = req.body;
    
    console.log("Received project ID:", project);
    
    const foundProject = await Project.findById(project);
    if (!foundProject) {
      console.log("Project not found in the database!");
      return res.status(404).json({ message: "Project not found" });
    }
    
    console.log("Project found:", foundProject);
    
    const assignedTo = req.userId;
    
    const newTask = new Task({
      title,
      description,
      status: "pending",
      project,
      assignedTo,
      priority,
      progressPercentage: 0,
      timeSpent: 0,
      taskDetails: taskDetails || "",
      repoOwner: repoOwner || "",
      repoName: repoName || "",
      branchName: branchName || ""
    });
    
    await newTask.save();
    
    if (taskDetails) {
      try {
        const riskPrediction = await predictTaskRisk(taskDetails);
        if (riskPrediction) {
          newTask.risk = riskPrediction.risk;
          newTask.riskConfidence = riskPrediction.confidence;
          await newTask.save();
        }
      } catch (predictionError) {
        console.error("Error predicting task risk:", predictionError);
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
    res.status(500).json({ message: "Error creating task", error: error.message });
  }
};

const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const { ObjectId } = require('mongoose').Types;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid task ID format" });
    }
    
    const task = await Task.findById(id).populate('assignedTo');
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    
    if (!task.assignedTo || !req.userId || task.assignedTo._id.toString() !== req.userId) {
      return res.status(403).json({ 
        message: "Unauthorized: You are not assigned to this task",
        details: {
          taskAssignedTo: task.assignedTo ? task.assignedTo._id : null,
          currentUser: req.userId
        }
      });
    }
    
    const taskDetailsChanged = updates.taskDetails && updates.taskDetails !== task.taskDetails;
    
    const allowedUpdates = ['title', 'description', 'project', 'taskDetails', 'priority', 'status', 'repoOwner', 'repoName', 'branchName'];
    const updatesToApply = {};
    
    Object.keys(updates).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        updatesToApply[key] = updates[key];
      }
    });
    
    Object.assign(task, updatesToApply);
    
    if (taskDetailsChanged && updates.taskDetails) {
      try {
        const riskPrediction = await predictTaskRisk(updates.taskDetails);
        if (riskPrediction) {
          task.risk = riskPrediction.risk;
          task.riskConfidence = riskPrediction.confidence;
        }
      } catch (predictionError) {
        console.error("Risk prediction error:", predictionError);
      }
    }
    
    const updatedTask = await task.save();
    
    res.status(200).json({ 
      message: "Task updated successfully", 
      task: updatedTask 
    });
    
  } catch (error) {
    console.error('Update task error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: "Validation error",
        errors: error.errors 
      });
    }
    
    res.status(500).json({ 
      message: "Server error during task update",
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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
    res.status(500).json({ message: "Error deleting task", error: error.message });
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
    res.status(500).json({ message: "Error setting task to pending", error: error.message });
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
    res.status(500).json({ message: "Error setting task to in-progress", error: error.message });
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
    res.status(500).json({ message: "Error setting task to completed", error: error.message });
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
    res.status(500).json({ message: "Error assigning task", error: error.message });
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
    res.status(500).json({ message: "Error sorting tasks by priority", error: error.message });
  }
};

const updateTaskProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const { progressPercentage, status, timeSpent } = req.body;

    console.log('Received taskId:', id);

    const { ObjectId } = require('mongoose').Types;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid task ID format" });
    }

    const task = await Task.findById(id);
    console.log('Task found:', task);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (task.assignedTo.toString() !== req.userId) {
      return res.status(403).json({ message: "Unauthorized: You are not assigned to this task" });
    }

    if (progressPercentage !== undefined) {
      if (progressPercentage < 0 || progressPercentage > 100) {
        return res.status(400).json({ message: "Progress must be between 0 and 100%" });
      }
      task.progressPercentage = progressPercentage;
    }

    if (status) {
      task.status = status;
      if (status === "completed") {
        task.completedOn = new Date();
        task.progressPercentage = 100;
      }
    }

    if (timeSpent !== undefined) {
      if (timeSpent < 0) {
        return res.status(400).json({ message: "Time spent cannot be negative" });
      }
      task.timeSpent += timeSpent;
    }

    await task.save();
    res.status(200).json({ message: "Task updated successfully", task });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: "Error updating task progress", error: error.message });
  }
};

const getTaskWithProgress = async (req, res) => {
  try {
    const status = req.query.status || "pending";
    const tasks = await Task.find({ 
      assignedTo: req.userId, 
      status: { $regex: status, $options: 'i' }
    }).populate('assignedTo');
    res.status(200).json(tasks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching tasks with progress", error: error.message });
  }
};

const fetchAllCommits = async (url, token) => {
  let commits = [];
  let currentUrl = url;

  while (currentUrl) {
    const response = await fetch(currentUrl, {
      headers: {
        Authorization: `token ${token}`,
        'User-Agent': 'Commit-Tracker-App',
      },
    });

    if (!response.ok) {
      console.error(`GitHub API error: ${response.status} ${response.statusText}`);
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    try {
      const data = await response.json();
      commits = commits.concat(data);

      const linkHeader = response.headers.get("Link");
      currentUrl = linkHeader ? 
        linkHeader.split(",").find(link => link.includes('rel="next"'))?.split(";")[0].trim().slice(1, -1) : 
        null;
    } catch (error) {
      console.error("Error parsing GitHub response:", error);
      throw error;
    }
  }

  return commits;
};

const fetchAllPullRequests = async (url, token) => {
  let pullRequests = [];
  let currentUrl = url;

  while (currentUrl) {
    const response = await fetch(currentUrl, {
      headers: {
        Authorization: `token ${token}`,
        'User-Agent': 'Commit-Tracker-App',
      },
    });

    if (!response.ok) {
      console.error(`GitHub API error: ${response.status} ${response.statusText}`);
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    try {
      const data = await response.json();
      pullRequests = pullRequests.concat(data);

      const linkHeader = response.headers.get("Link");
      currentUrl = linkHeader ? 
        linkHeader.split(",").find(link => link.includes('rel="next"'))?.split(";")[0].trim().slice(1, -1) : 
        null;
    } catch (error) {
      console.error("Error parsing GitHub response:", error);
      throw error;
    }
  }

  return pullRequests;
};

const trackGitHubCommits = async (req, res) => {
  try {
    const { taskId } = req.params;

    const { ObjectId } = require('mongoose').Types;
    if (!ObjectId.isValid(taskId)) {
      return res.status(400).json({ message: "Invalid task ID format" });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const { repoOwner, repoName, branchName } = task;

    if (!repoOwner || !repoName || !branchName) {
      return res.status(400).json({ message: "Missing GitHub repo information in task" });
    }

    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      return res.status(500).json({ message: "GitHub token not configured" });
    }

    // Fetch all commits
    const commitsUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/commits?sha=${branchName}`;
    const commits = await fetchAllCommits(commitsUrl, githubToken);

    // Process commits to include only required fields
    const formattedCommits = commits.map(commit => ({
      message: commit.commit.message,
      author: commit.commit.author.name,
      date: commit.commit.author.date,
      sha: commit.sha,
      url: commit.html_url
    }));

    // Fetch all merged pull requests
    const pullsUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/pulls?state=closed&base=${branchName}`;
    const pullRequests = await fetchAllPullRequests(pullsUrl, githubToken);

    // Filter for merged PRs and format the response
    const formattedPullRequests = pullRequests
      .filter(pr => pr.merged_at)
      .map(pr => ({
        title: pr.title,
        merge_date: pr.merged_at,
        url: pr.html_url,
        number: pr.number
      }));

    res.status(200).json({
      message: `Fetched ${formattedCommits.length} commits and ${formattedPullRequests.length} merged pull requests from ${repoOwner}/${repoName} on branch ${branchName}`,
      commits: formattedCommits,
      pull_requests: formattedPullRequests
    });

  } catch (error) {
    console.error("Error tracking GitHub activity:", error);
    res.status(500).json({ 
      message: "Error tracking GitHub activity", 
      error: error.message 
    });
  }
};


//////////////// hugging face predection 

const predictTaskRisk = async (taskDetails) => {
  if (!taskDetails) return null;
  
  const HUGGING_FACE_API_KEY = process.env.HUGGING_FACE_API_KEY;
  if (!HUGGING_FACE_API_KEY) {
    console.error('Hugging Face API key is not set');
    return null;
  }

  // Configuration
  const MAX_RETRIES = 3;
  const INITIAL_BACKOFF = 1000; // 1 second
  let currentBackoff = INITIAL_BACKOFF;
  
  // Use T5 model with IA3 fine-tuning for classification
  // This is a smaller, more efficient model that should be more responsive
  const MODEL_URL = "https://api-inference.huggingface.co/models/google/t5-small";
  
  // Retry loop
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`Attempt ${attempt} of ${MAX_RETRIES}`);
      
      const response = await fetch(MODEL_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HUGGING_FACE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: `classify as high risk or low risk: ${taskDetails}`,
        }),
      });
      
      // Handle rate limiting
      if (response.status === 429) {
        console.log(`Rate limit exceeded (429). Backing off for ${currentBackoff}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, currentBackoff));
        currentBackoff *= 2; // Exponential backoff
        continue;
      }
      
      // Handle other error status codes
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Hugging Face response:', result);
      
      // Process the text generation result
      if (result && typeof result === 'string') {
        const generatedText = result.toLowerCase().trim();
        const isHighRisk = generatedText.includes("high risk");
        
        // Calculate confidence based on the clarity of the response
        let confidence = 0.75; // Default confidence
        
        if (generatedText === "high risk") {
          confidence = 0.95; // Very clear high risk
        } else if (generatedText === "low risk") {
          confidence = 0.95; // Very clear low risk
        } else if (generatedText.includes("high") && generatedText.includes("risk")) {
          confidence = 0.85; // Contains high risk but with other text
        } else if (generatedText.includes("low") && generatedText.includes("risk")) {
          confidence = 0.85; // Contains low risk but with other text
        }
        
        return {
          risk: isHighRisk ? "High Risk" : "Low Risk",
          confidence: confidence
        };
      }
      
      // Fallback to keyword-based assessment if model response is unexpected
      return keywordBasedRiskAssessment(taskDetails);
      
    } catch (error) {
      console.error(`Error in attempt ${attempt}:`, error.message);
      
      if (attempt < MAX_RETRIES) {
        console.log(`Backing off for ${currentBackoff}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, currentBackoff));
        currentBackoff *= 2; // Exponential backoff
      } else {
        console.error('Max retries reached. Falling back to keyword analysis.');
        return keywordBasedRiskAssessment(taskDetails);
      }
    }
  }
  
  return keywordBasedRiskAssessment(taskDetails);
};

// Helper function for keyword-based risk assessment as fallback
const keywordBasedRiskAssessment = (taskDetails) => {
  // Enhanced keyword-based risk assessment with weighted categories
  const riskFactors = {
    highRisk: {
      keywords: [
        'urgent', 'critical', 'immediate', 'emergency', 'asap', 
        'deadline', 'tomorrow', 'today', 'overdue', 'late',
        'priority', 'crucial', 'vital', 'essential'
      ],
      weight: 1.5
    },
    complexity: {
      keywords: [
        'complex', 'difficult', 'challenging', 'complicated', 'intricate',
        'advanced', 'sophisticated', 'technical', 'specialized', 'expert'
      ],
      weight: 1.2
    },
    scope: {
      keywords: [
        'large', 'extensive', 'comprehensive', 'broad', 'wide',
        'multiple', 'many', 'several', 'numerous', 'various'
      ],
      weight: 1.0
    },
    dependencies: {
      keywords: [
        'dependent', 'dependency', 'relies', 'reliant', 'prerequisite',
        'blocker', 'blocking', 'contingent', 'conditional', 'waiting'
      ],
      weight: 1.3
    }
  };
  
  const taskDetailsLower = taskDetails.toLowerCase();
  const totalWords = taskDetailsLower.split(/\s+/).length;
  
  // Calculate weighted score for each risk factor
  let totalRiskScore = 0;
  let totalWeight = 0;
  
  Object.entries(riskFactors).forEach(([category, { keywords, weight }]) => {
    let categoryScore = 0;
    
    keywords.forEach(keyword => {
      // Count occurrences of each keyword
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = taskDetailsLower.match(regex);
      if (matches) {
        categoryScore += matches.length;
      }
    });
    
    // Normalize by text length and apply weight
    const normalizedCategoryScore = (categoryScore / Math.max(1, totalWords)) * weight;
    totalRiskScore += normalizedCategoryScore;
    totalWeight += weight;
  });
  
  // Calculate final risk score (0-1 scale)
  const finalScore = Math.min(1, (totalRiskScore / totalWeight) * 10);
  
  // Dynamic threshold based on text length
  const threshold = Math.max(0.15, Math.min(0.3, 0.15 + (totalWords / 1000)));
  const isHighRisk = finalScore > threshold;
  
  // Calculate confidence (higher for extreme values, lower for borderline)
  const distanceFromThreshold = Math.abs(finalScore - threshold);
  const confidence = Math.min(0.99, Math.max(0.5, 0.5 + distanceFromThreshold * 2));
  
  console.log(`Fallback risk assessment: Score=${finalScore.toFixed(2)}, Threshold=${threshold.toFixed(2)}, High Risk=${isHighRisk}, Confidence=${confidence.toFixed(2)}`);
  
  return {
    risk: isHighRisk ? "High Risk" : "Low Risk",
    confidence: confidence
  };
};


const predictRisk = async (req, res) => {
  const { taskId, taskDetails } = req.body;
  
  if (taskId && !taskDetails) {
    try {
      const task = await Task.findById(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      const result = await predictTaskRisk(task.taskDetails);
      if (!result) {
        return res.status(400).json({ message: "Unable to get a prediction from the model" });
      }
      
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
  
  if (!taskDetails) {
    return res.status(400).json({ message: "Task details are required" });
  }
  
  try {
    const result = await predictTaskRisk(taskDetails);
    if (!result) {
      return res.status(400).json({ message: "Unable to get a prediction from the model" });
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
const getMyTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ assignedTo: req.userId }).populate('project');
    res.json(tasks);
  } catch (error) {
    console.error("Error fetching assigned tasks:", error);
    res.status(500).json({ message: "Error fetching your assigned tasks", error: error.message });
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
  getMyTasks,
};
