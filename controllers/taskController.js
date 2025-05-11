const User = require("../models/User");
const Group = require("../models/Group");
const Project = require("../models/Project");
const Task = require("../models/Task");
const mongoose = require('mongoose');
const fetch = require('node-fetch');
const esprima = require('esprima');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { generateQuestionsWithOllama } = require('../services/ollamaService');

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

    const commitsUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/commits?sha=${branchName}`;
    const commits = await fetchAllCommits(commitsUrl, githubToken);

    const formattedCommits = commits.map(commit => ({
      message: commit.commit.message,
      author: commit.commit.author.name,
      date: commit.commit.author.date,
      sha: commit.sha,
      url: commit.html_url
    }));

    const pullsUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/pulls?state=closed&base=${branchName}`;
    const pullRequests = await fetchAllPullRequests(pullsUrl, githubToken);

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

const predictTaskRisk = async (taskDetails) => {
  if (!taskDetails) return null;
  
  const HUGGING_FACE_API_KEY = process.env.HUGGING_FACE_API_KEY;
  if (!HUGGING_FACE_API_KEY) {
    console.error('Hugging Face API key is not set');
    return null;
  }

  const MAX_RETRIES = 3;
  const INITIAL_BACKOFF = 1000;
  let currentBackoff = INITIAL_BACKOFF;
  
  const MODEL_URL = "https://api-inference.huggingface.co/models/google/t5-small";
  
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
      
      if (response.status === 429) {
        console.log(`Rate limit exceeded (429). Backing off for ${currentBackoff}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, currentBackoff));
        currentBackoff *= 2;
        continue;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Hugging Face response:', result);
      
      if (result && typeof result === 'string') {
        const generatedText = result.toLowerCase().trim();
        const isHighRisk = generatedText.includes("high risk");
        
        let confidence = 0.75;
        
        if (generatedText === "high risk") {
          confidence = 0.95;
        } else if (generatedText === "low risk") {
          confidence = 0.95;
        } else if (generatedText.includes("high") && generatedText.includes("risk")) {
          confidence = 0.85;
        } else if (generatedText.includes("low") && generatedText.includes("risk")) {
          confidence = 0.85;
        }
        
        return {
          risk: isHighRisk ? "High Risk" : "Low Risk",
          confidence: confidence
        };
      }
      
      return keywordBasedRiskAssessment(taskDetails);
      
    } catch (error) {
      console.error(`Error in attempt ${attempt}:`, error.message);
      
      if (attempt < MAX_RETRIES) {
        console.log(`Backing off for ${currentBackoff}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, currentBackoff));
        currentBackoff *= 2;
      } else {
        console.error('Max retries reached. Falling back to keyword analysis.');
        return keywordBasedRiskAssessment(taskDetails);
      }
    }
  }
  
  return keywordBasedRiskAssessment(taskDetails);
};

const keywordBasedRiskAssessment = (taskDetails) => {
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
  
  let totalRiskScore = 0;
  let totalWeight = 0;
  
  Object.entries(riskFactors).forEach(([category, { keywords, weight }]) => {
    let categoryScore = 0;
    
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = taskDetailsLower.match(regex);
      if (matches) {
        categoryScore += matches.length;
      }
    });
    
    const normalizedCategoryScore = (categoryScore / Math.max(1, totalWords)) * weight;
    totalRiskScore += normalizedCategoryScore;
    totalWeight += weight;
  });
  
  const finalScore = Math.min(1, (totalRiskScore / totalWeight) * 10);
  
  const threshold = Math.max(0.15, Math.min(0.3, 0.15 + (totalWords / 1000)));
  const isHighRisk = finalScore > threshold;
  
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

// New quiz-related functions
const generateQuiz = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { commitShas } = req.body;

    // Validate taskId
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({ message: "Invalid task ID format" });
    }

    // Get task and validate permissions
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    
    // Check if the student has already passed any quiz for this task
    // Check both the hasPassedQuiz field and the quizzes array
    if (task.hasPassedQuiz || task.quizzes.some(quiz => 
      quiz.attempts.some(attempt => 
        attempt.userId.toString() === req.userId && attempt.passed
      )
    )) {
      return res.status(403).json({ 
        message: "You have already passed a quiz for this task and cannot generate another.",
        alreadyPassed: true
      });
    }

    // Fetch commits from GitHub
    const commits = await fetchAllCommits(
      `https://api.github.com/repos/${task.repoOwner}/${task.repoName}/commits?sha=${task.branchName}`, 
      process.env.GITHUB_TOKEN
    );
    
    const selectedCommits = commitShas 
      ? commits.filter(c => commitShas.includes(c.sha))
      : commits.slice(0, 5);

    if (selectedCommits.length === 0) {
      return res.status(404).json({ message: "No commits found" });
    }

    // Fetch the actual code diffs for each commit
    for (let commit of selectedCommits) {
      try {
        const diffUrl = `https://api.github.com/repos/${task.repoOwner}/${task.repoName}/commits/${commit.sha}`;
        const diffResponse = await fetch(diffUrl, {
          headers: { 
            'Accept': 'application/vnd.github.v3.diff',
            'Authorization': `token ${process.env.GITHUB_TOKEN}`
          }
        });
        
        if (!diffResponse.ok) {
          console.error(`Failed to fetch diff: ${diffResponse.status} ${diffResponse.statusText}`);
          commit.diff = "";
          continue;
        }
        
        const diffText = await diffResponse.text();
        commit.diff = diffText || "";
        
        console.log(`Fetched diff for commit ${commit.sha}, length: ${commit.diff.length} characters`);
      } catch (error) {
        console.error(`Error fetching diff for commit ${commit.sha}:`, error);
        commit.diff = "";
      }
    }

    // Check if we have any valid diffs
    const validCommits = selectedCommits.filter(c => c.diff && typeof c.diff === 'string' && c.diff.length > 0);
    if (validCommits.length === 0) {
      console.log("No valid diffs found, using default questions");
      const questions = createDefaultQuiz();
      const quiz = { questions, commitSha: selectedCommits[0].sha, createdAt: new Date() };
      task.quizzes = task.quizzes || [];
      task.quizzes.push(quiz);
      await task.save();
      return res.status(200).json({ message: "Quiz generated", quizId: task.quizzes.length - 1, questions });
    }

    // Parse the code changes from the diff
    const codeChanges = parseCodeDiff(validCommits[0].diff || '');
    console.log(`Parsed ${codeChanges.length} code changes from diff`);

    // Filter for source code files
    const sourceCodeChanges = codeChanges.filter(change => 
      change.file && 
      (change.file.endsWith('.js') || change.file.endsWith('.jsx') || change.file.endsWith('.css'))
    );
    console.log(`Found ${sourceCodeChanges.length} source code changes`);

    // Generate questions
    let questions = [];

    // Try Ollama with ollamacode model
    if (sourceCodeChanges.length > 0) {
      try {
        console.log("Attempting to generate questions with Ollama (ollamacode)");
        questions = await generateQuestionsWithOllama(
          sourceCodeChanges,
          validCommits[0].commit.message,
          task.taskDetails
        );
        
        if (questions && questions.length >= 5) {
          console.log(`Successfully generated ${questions.length} questions with Ollama (ollamacode)`);
        } else {
          console.log(`Ollama returned ${questions?.length || 0} questions, falling back to local generation`);
          throw new Error("Ollama returned insufficient questions");
        }
      } catch (ollamaError) {
        console.error("Ollama (ollamacode) question generation failed:", ollamaError.message);
        console.log("Falling back to local code-based question generation");
        questions = generateCodeBasedQuestions(sourceCodeChanges, validCommits[0].commit.message);
        
        if (!questions || questions.length < 5) {
          console.log(`Local generation produced ${questions?.length || 0} questions, supplementing with defaults`);
          questions = [...questions, ...createDefaultQuiz()].slice(0, 5);
        }
      }
    } else {
      console.log("No source code changes found, using default questions");
      questions = createDefaultQuiz();
    }

    // Ensure questions have the correct format
    const validatedQuestions = questions.map(q => ({
      question: q.question || "What is the purpose of this code change?",
      options: Array.isArray(q.options) && q.options.length === 4 ? 
        q.options : 
        ["A: Option 1", "B: Option 2", "C: Option 3", "D: Option 4"],
      correctAnswer: q.correctAnswer || q.options?.[0] || "A: Option 1",
      explanation: q.explanation || "This change aligns with the commit's purpose."
    }));
    
    // Save the validated questions
    const quiz = {
      questions: validatedQuestions,
      commitSha: validCommits[0].sha,
      createdAt: new Date()
    };
    
    task.quizzes = task.quizzes || [];
    task.quizzes.push(quiz);
    await task.save();

    res.status(200).json({
      message: "Quiz generated",
      quizId: task.quizzes.length - 1,
      questions: validatedQuestions
    });
    
  } catch (error) {
    console.error('Error generating quiz:', error);
    res.status(500).json({ message: 'Failed to generate quiz', error: error.message });
  }
};

function generateCodeBasedQuestions(codeChanges, commitMessage) {
  if (!codeChanges || codeChanges.length === 0) {
    console.log("No code changes to generate questions from");
    return [];
  }
  
  const questions = [];
  const seenFiles = new Set(); // Track files for diversity
  const seenQuestions = new Set(); // Track questions for uniqueness

  // Add a question about the commit purpose
  const commitQuestion = {
    question: `What is the purpose of the commit "${commitMessage.substring(0, 30)}${commitMessage.length > 30 ? '...' : ''}"?`,
    options: [
      "A: Adding new features",
      "B: Fixing bugs",
      "C: Refactoring code",
      "D: Updating documentation"
    ],
    correctAnswer: commitMessage.toLowerCase().includes('fix') ? 
                  "B: Fixing bugs" : 
                  "A: Adding new features",
    explanation: `Based on the commit message "${commitMessage}", this appears to be ${
      commitMessage.toLowerCase().includes('fix') ? 'fixing a bug' : 'adding new functionality'
    }.`
  };
  questions.push(commitQuestion);
  seenQuestions.add(`${commitQuestion.question}|commit`);

  // Select up to 4 significant changes from different files
  const significantChanges = codeChanges
    .filter(change => 
      change.code.trim().length > 20 && // Stricter length filter
      change.file && 
      (change.file.endsWith('.js') || change.file.endsWith('.jsx') || change.file.endsWith('.css')) &&
      !seenFiles.has(change.file)
    )
    .sort((a, b) => b.code.length - a.code.length) // Prioritize larger changes
    .slice(0, 4)
    .map(change => {
      seenFiles.add(change.file);
      return change;
    });

  console.log(`Selected ${significantChanges.length} significant changes from files: ${Array.from(seenFiles)}`);

  // Generate questions for each significant change
  for (const change of significantChanges) {
    const fileExt = change.file.split('.').pop().toLowerCase();
    const codeSnippet = change.code.trim();
    let question;

    if (fileExt === 'css') {
      question = {
        question: `What is the effect of the CSS change in ${change.file}?`,
        options: [
          "A: Adjusts layout alignment",
          "B: Changes font styling",
          "C: Adds animations",
          "D: Modifies colors"
        ],
        correctAnswer: "A: Adjusts layout alignment",
        explanation: `The CSS change in ${change.file} modifies layout properties, aligning with the commit "${commitMessage}". Sample: ${codeSnippet.substring(0, 50)}...`
      };
    } else if (codeSnippet.includes('<Route') || codeSnippet.includes('react-router-dom')) {
      question = {
        question: `What does the routing change in ${change.file} accomplish?`,
        options: [
          "A: Adds a new navigation path",
          "B: Removes an existing route",
          "C: Modifies route parameters",
          "D: Changes route rendering logic"
        ],
        correctAnswer: "A: Adds a new navigation path",
        explanation: `The routing change in ${change.file} adds a new path, as indicated by the code: ${codeSnippet.substring(0, 50)}...`
      };
    } else if (codeSnippet.includes('import ') && codeSnippet.includes('from "./pages/')) {
      question = {
        question: `What is the purpose of the import statement in ${change.file}?`,
        options: [
          "A: Imports a new component for rendering",
          "B: Imports a utility function",
          "C: Imports a styling module",
          "D: Imports a configuration file"
        ],
        correctAnswer: "A: Imports a new component for rendering",
        explanation: `The import in ${change.file} brings in a component, likely for rendering, as shown: ${codeSnippet.substring(0, 50)}...`
      };
    } else if (codeSnippet.includes('useState') || codeSnippet.includes('useEffect') || codeSnippet.includes('return (')) {
      question = {
        question: `What does the React component in ${change.file} do?`,
        options: [
          "A: Renders dynamic UI elements",
          "B: Manages application routing",
          "C: Handles form submissions",
          "D: Performs data validation"
        ],
        correctAnswer: "A: Renders dynamic UI elements",
        explanation: `The React component in ${change.file} renders UI elements, as modified in the commit "${commitMessage}". Sample: ${codeSnippet.substring(0, 50)}...`
      };
    } else if (codeSnippet.includes('function') || codeSnippet.includes('=>') || codeSnippet.includes('async')) {
      question = {
        question: `What does the function in ${change.file} do?`,
        options: [
          "A: Processes data and returns a result",
          "B: Modifies external state or resources",
          "C: Handles errors or exceptions",
          "D: Validates input parameters"
        ],
        correctAnswer: "A: Processes data and returns a result",
        explanation: `The function in ${change.file} processes data, as shown: ${codeSnippet.substring(0, 50)}...`
      };
    } else {
      question = {
        question: `What does the code change in ${change.file} accomplish?`,
        options: [
          "A: Implements a new feature",
          "B: Fixes a bug or issue",
          "C: Improves code readability",
          "D: Optimizes performance"
        ],
        correctAnswer: commitMessage.toLowerCase().includes('fix') ? 
                      "B: Fixes a bug or issue" : 
                      "A: Implements a new feature",
        explanation: `The code change in ${change.file} aligns with the commit "${commitMessage}". Sample: ${codeSnippet.substring(0, 50)}...`
      };
    }

    // Ensure question uniqueness by including file in check
    const questionKey = `${question.question}|${change.file}`;
    if (!seenQuestions.has(questionKey)) {
      questions.push(question);
      seenQuestions.add(questionKey);
    }
  }

  // Ensure exactly 5 questions
  while (questions.length < 5) {
    const defaultQuestion = {
      question: "What is a best practice for writing clean code?",
      options: [
        "A: Use short, unclear variable names",
        "B: Write clear, descriptive variable and function names",
        "C: Combine multiple functions into one",
        "D: Avoid comments entirely"
      ],
      correctAnswer: "B: Write clear, descriptive variable and function names",
      explanation: "Descriptive names improve code readability and maintainability."
    };
    const questionKey = `${defaultQuestion.question}|default`;
    if (!seenQuestions.has(questionKey)) {
      questions.push(defaultQuestion);
      seenQuestions.add(questionKey);
    }
  }

  return questions.slice(0, 5);
}

function createDefaultQuiz() {
  return [
    {
      question: "What is the best practice for code documentation?",
      options: [
        "A: Document only complex functions",
        "B: Write comments for every line of code",
        "C: Use clear names with comments for complex logic",
        "D: Rely on code being self-documenting"
      ],
      correctAnswer: "C: Use clear names with comments for complex logic",
      explanation: "Good documentation balances clear naming with targeted comments."
    },
    {
      question: "Which version control practice is recommended?",
      options: [
        "A: Commit directly to the main branch",
        "B: Create feature branches and use pull requests",
        "C: Create branches for each file",
        "D: Commit only when the feature is complete"
      ],
      correctAnswer: "B: Create feature branches and use pull requests",
      explanation: "Feature branches keep the main branch stable and allow code review."
    },
    {
      question: "What is the purpose of unit testing?",
      options: [
        "A: To slow down development",
        "B: To verify individual components work correctly",
        "C: To replace manual testing",
        "D: To test the entire application"
      ],
      correctAnswer: "B: To verify individual components work correctly",
      explanation: "Unit tests catch issues early by testing components in isolation."
    },
    {
      question: "What is a key principle of clean code?",
      options: [
        "A: Minimize comments",
        "B: Create multi-purpose functions",
        "C: Use descriptive names for variables and functions",
        "D: Maximize function length"
      ],
      correctAnswer: "C: Use descriptive names for variables and functions",
      explanation: "Descriptive names make code easier to understand."
    },
    {
      question: "What is a benefit of version control?",
      options: [
        "A: Makes code run faster",
        "B: Tracks changes over time",
        "C: Increases code complexity",
        "D: Reduces code readability"
      ],
      correctAnswer: "B: Tracks changes over time",
      explanation: "Version control systems track changes and enable collaboration."
    }
  ];
}

function getLanguageFromExtension(ext) {
  const languageMap = {
    'js': 'JavaScript',
    'jsx': 'JavaScript/React',
    'ts': 'TypeScript',
    'tsx': 'TypeScript/React',
    'py': 'Python',
    'css': 'CSS',
    'html': 'HTML'
  };
  return languageMap[ext] || 'unknown';
}

// taskController.js (partial)
const submitQuiz = async (req, res) => {
  try {
    const { taskId, answers } = req.body;
    const quizId = parseInt(req.params.quizId);

    // Validate taskId
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({ message: "Invalid task ID format" });
    }

    // Get task and validate permissions
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check if the student is assigned to this task
    if (task.assignedTo.toString() !== req.userId) {
      return res.status(403).json({ message: "Unauthorized: Not assigned to this task" });
    }

    // Check if the student has already passed ANY quiz for this task
    const hasPassedQuiz = task.quizzes.some(quiz => 
      quiz.attempts.some(attempt => 
        attempt.userId.toString() === req.userId && attempt.passed
      )
    );
    
    if (hasPassedQuiz) {
      return res.status(403).json({ 
        message: "You have already passed a quiz for this task and cannot attempt another.",
        alreadyPassed: true,
        score: 0,
        results: []
      });
    }

    // Check for retry cooldown (if applicable)
    const lastAttempt = task.quizzes[quizId].attempts
      .filter(a => a.userId.toString() === req.userId)
      .sort((a, b) => b.completedAt - a.completedAt)[0];
    if (lastAttempt) {
      const cooldown = 60 * 60 * 1000; // 1 hour
      if (new Date() - new Date(lastAttempt.completedAt) < cooldown) {
        return res.status(429).json({ message: "Retry cooldown: Please wait before retaking the quiz" });
      }
    }

    const quiz = task.quizzes[quizId];
    let score = 0;
    const results = [];

    quiz.questions.forEach((q, i) => {
      const isCorrect = answers[i] === q.correctAnswer;
      if (isCorrect) score += 10; // 10 points per question
      results.push({
        question: q.question,
        studentAnswer: answers[i],
        correctAnswer: q.correctAnswer,
        isCorrect,
        explanation: q.explanation
      });
    });

    const attempt = {
      userId: req.userId,
      score,
      results,
      completedAt: new Date(),
      passed: score >= 70
    };

    quiz.attempts.push(attempt);

    // When a quiz is passed, mark it in the task document
    if (attempt.passed) {
      // Update a field in the task to indicate this student has passed a quiz
      task.hasPassedQuiz = true;
      
      let progressIncrement = 0;
      if (score >= 80) progressIncrement = 20;
      else if (score >= 60) progressIncrement = 10;
      else progressIncrement = 5;
      task.progressPercentage = Math.min(100, (task.progressPercentage || 0) + progressIncrement);
    }

    await task.save();

    res.status(200).json({
      message: attempt.passed ? "Quiz passed" : "Quiz failed",
      score,
      results,
      progressPercentage: task.progressPercentage
    });
  } catch (error) {
    console.error("Error submitting quiz:", error);
    res.status(500).json({ message: "Error submitting quiz", error: error.message });
  }
};
const getQuizAnalytics = async (req, res) => {
  try {
    const taskId = req.params.taskId;
    
    const task = await Task.findById(taskId)
      .populate('assignedTo', 'name username email')
      .populate({
        path: 'quizzes.attempts.userId',
        select: 'name username email'
      });
    
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const analytics = task.quizzes.map((quiz, quizId) => ({
      quizId,
      createdAt: quiz.createdAt,
      attempts: quiz.attempts.map(attempt => {
        // Get the user data either from the populated userId or from task.assignedTo
        const userData = attempt.userId ? 
          (typeof attempt.userId === 'object' ? attempt.userId : null) : 
          null;
        
        return {
          userId: attempt.userId,
          username: userData?.name || task.assignedTo?.name || 'Unknown',
          email: userData?.email || task.assignedTo?.email || 'Unknown',
          score: attempt.score,
          passed: attempt.passed,
          completedAt: attempt.completedAt,
          results: attempt.results
        };
      })
    }));

    res.status(200).json({ message: "Quiz analytics retrieved", analytics });
  } catch (error) {
    console.error("Error fetching quiz analytics:", error);
    res.status(500).json({ message: "Error fetching quiz analytics", error: error.message });
  }
};

// New function to generate questions locally
async function generateQuestionsLocally(diff, commitMessage, taskDetails) {
  try {
    // Parse the diff to extract code changes
    const codeChanges = parseCodeDiff(diff);
    if (!codeChanges.length) {
      return generateFallbackQuestions(taskDetails);
    }

    // Generate questions based on code changes
    const questions = [];
    
    for (const change of codeChanges.slice(0, 3)) { // Limit to 3 questions
      const questionData = generateQuestionFromCode(change.code, commitMessage);
      if (questionData) {
        questions.push(questionData);
      }
    }
    
    // If we couldn't generate enough questions, add some fallback ones
    if (questions.length < 3) {
      const fallbackQuestions = generateFallbackQuestions(taskDetails);
      questions.push(...fallbackQuestions.slice(0, 3 - questions.length));
    }
    
    return questions;
  } catch (error) {
    console.error("Error generating questions locally:", error);
    return generateFallbackQuestions(taskDetails);
  }
}

/**
 * Improved function to parse GitHub diff format
 * @param {string} diff - The raw diff text from GitHub API
 * @returns {Array} - Array of parsed code changes
 */
function parseCodeDiff(diff) {
  const parsedChanges = [];
  try {
    // Check if diff is a string
    if (typeof diff !== 'string') {
      console.error('Invalid diff format:', typeof diff);
      return [];
    }
    
    // Log a sample of the diff for debugging
    console.log('Diff sample:', diff.substring(0, 200));
    
    // Split the diff into lines
    const lines = diff.split("\n");
    let currentFile = "";
    let inHunk = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Track the current file being modified
      if (line.startsWith('diff --git')) {
        currentFile = line.split(' ')[2].substring(2); // Extract filename
        console.log('Found file in diff:', currentFile);
        continue;
      }
      
      // Alternative file header format
      if (line.startsWith('--- a/') || line.startsWith('+++ b/')) {
        const filePath = line.substring(6);
        if (filePath && filePath !== '/dev/null') {
          currentFile = filePath;
          console.log('Found file in diff (alt format):', currentFile);
        }
        continue;
      }
      
      // Track when we're in a code hunk
      if (line.startsWith('@@')) {
        inHunk = true;
        console.log('Found hunk:', line);
        continue;
      }
      
      // Only process lines when we're in a code hunk
      if (inHunk) {
        // Extract added lines (actual code changes)
        if (line.startsWith("+") && !line.startsWith("+++")) {
          const code = line.substring(1).trim();
          if (code && code.length > 0) { // Accept any non-empty line
            parsedChanges.push({ 
              type: "added", 
              code,
              file: currentFile
            });
          }
        }
        // Extract removed lines
        else if (line.startsWith("-") && !line.startsWith("---")) {
          const code = line.substring(1).trim();
          if (code && code.length > 0) {
            parsedChanges.push({ 
              type: "removed", 
              code,
              file: currentFile
            });
          }
        }
      }
    }
    
    console.log(`Parsed ${parsedChanges.length} code changes from diff`);
    
    // If we found changes, log a sample
    if (parsedChanges.length > 0) {
      console.log('Sample change:', JSON.stringify(parsedChanges[0]));
    }
    
    return parsedChanges;
  } catch (error) {
    console.error("Error parsing diff:", error);
    return [];
  }
}

function generateQuestionFromCode(code, commitMessage) {
  try {
    // Determine the language of the code
    const language = detectLanguage(code);
    
    // Generate question based on the code and language
    if (language === 'javascript' || language === 'typescript') {
      return generateJavaScriptQuestion(code, commitMessage);
    } else if (language === 'python') {
      return generatePythonQuestion(code, commitMessage);
    } else {
      return generateGenericQuestion(code, commitMessage);
    }
  } catch (error) {
    console.error("Error generating question from code:", error);
    return null;
  }
}

function detectLanguage(code) {
  // Simple language detection based on syntax
  if (code.includes('function') || code.includes('const') || code.includes('let') || 
      code.includes('var') || code.includes('=>')) {
    return 'javascript';
  } else if (code.includes('def ') || code.includes('import ') || code.includes('class ') && 
             code.includes(':')) {
    return 'python';
  } else {
    return 'generic';
  }
}

function generateJavaScriptQuestion(code, commitMessage) {
  try {
    // Try to parse the code with esprima to understand its structure
    let ast;
    try {
      ast = esprima.parseScript(code);
    } catch (e) {
      // If parsing fails, fall back to generic question
      return generateGenericQuestion(code, commitMessage);
    }
    
    // Generate different types of questions based on the code structure
    if (code.includes('function') || code.includes('=>')) {
      return {
        question: `What is the purpose of the function in this code: "${truncateCode(code)}"?`,
        options: [
          "To process data and return a result",
          "To modify the DOM or UI",
          "To handle an event or user interaction",
          "To make an API call or fetch data"
        ],
        answer: "To process data and return a result", // Default answer, would need more sophisticated analysis
        explanation: `This function appears in a commit with message: "${commitMessage}". Understanding function purpose is key to maintaining code.`
      };
    } else if (code.includes('if') || code.includes('else')) {
      return {
        question: `What condition is being checked in this code: "${truncateCode(code)}"?`,
        options: [
          "Checking if a value exists or is truthy",
          "Comparing two values for equality",
          "Validating user input or data",
          "Handling an error condition"
        ],
        answer: "Checking if a value exists or is truthy", // Default answer
        explanation: `This conditional logic appears in a commit with message: "${commitMessage}". Understanding conditions is essential for code flow.`
      };
    } else {
      return generateGenericQuestion(code, commitMessage);
    }
  } catch (error) {
    console.error("Error generating JavaScript question:", error);
    return generateGenericQuestion(code, commitMessage);
  }
}

function generatePythonQuestion(code, commitMessage) {
  // Similar to JavaScript but for Python syntax
  if (code.includes('def ')) {
    return {
      question: `What does this Python function do: "${truncateCode(code)}"?`,
      options: [
        "Process data and return a result",
        "Interact with external systems",
        "Handle exceptions or errors",
        "Perform data validation"
      ],
      answer: "Process data and return a result", // Default answer
      explanation: `This Python function appears in a commit with message: "${commitMessage}". Understanding function behavior is crucial.`
    };
  } else if (code.includes('class ')) {
    return {
      question: `What is the purpose of this Python class: "${truncateCode(code)}"?`,
      options: [
        "To encapsulate related data and methods",
        "To implement an interface or abstract class",
        "To extend functionality of another class",
        "To create a singleton pattern"
      ],
      answer: "To encapsulate related data and methods", // Default answer
      explanation: `This class definition appears in a commit with message: "${commitMessage}". Classes help organize code.`
    };
  } else {
    return generateGenericQuestion(code, commitMessage);
  }
}

function generateGenericQuestion(code, commitMessage) {
  // Fallback for when we can't generate specific questions
  return {
    question: `What does this code do: "${truncateCode(code)}"?`,
    options: [
      "Implements a new feature",
      "Fixes a bug or issue",
      "Refactors existing code",
      "Adds documentation or comments"
    ],
    answer: commitMessage.toLowerCase().includes('fix') ? 
            "Fixes a bug or issue" : 
            "Implements a new feature", // Simple heuristic based on commit message
    explanation: `This code appears in a commit with message: "${commitMessage}". Understanding code changes is essential for maintenance.`
  };
}

function generateFallbackQuestions(taskDetails) {
  // Generate generic questions when we can't extract meaningful questions from code
  return [
    {
      question: "What is the best practice for code documentation?",
      options: [
        "Document only complex functions",
        "Write comments for every line of code",
        "Use clear function and variable names with comments for complex logic",
        "Rely on code being self-documenting"
      ],
      answer: "Use clear function and variable names with comments for complex logic",
      explanation: "Good documentation balances clear naming with targeted comments for complex sections."
    },
    {
      question: "Which version control practice is recommended for feature development?",
      options: [
        "Commit directly to the main branch",
        "Create a feature branch and merge via pull request",
        "Create multiple branches for each file changed",
        "Avoid committing until the feature is completely finished"
      ],
      answer: "Create a feature branch and merge via pull request",
      explanation: "Feature branches keep the main branch stable while allowing code review before merging."
    },
    {
      question: "What is the purpose of unit testing?",
      options: [
        "To slow down development and add bureaucracy",
        "To verify individual components work as expected in isolation",
        "To replace manual testing completely",
        "To test the entire application at once"
      ],
      answer: "To verify individual components work as expected in isolation",
      explanation: "Unit tests ensure components work correctly on their own, making it easier to identify issues."
    }
  ];
}

function truncateCode(code, maxLength = 100) {
  // Truncate code for display in questions
  if (code.length <= maxLength) return code;
  return code.substring(0, maxLength - 3) + '...';
}

function createDefaultQuiz() {
  return [
    {
      question: "What is the best practice for code documentation?",
      options: [
        "A: Document only complex functions",
        "B: Write comments for every line of code",
        "C: Use clear function and variable names with comments for complex logic",
        "D: Rely on code being self-documenting"
      ],
      correctAnswer: "C: Use clear function and variable names with comments for complex logic",
      explanation: "Good documentation balances clear naming with targeted comments for complex sections."
    },
    {
      question: "Which version control practice is recommended for feature development?",
      options: [
        "A: Commit directly to the main branch",
        "B: Create a feature branch and merge via pull request",
        "C: Create multiple branches for each file changed",
        "D: Avoid committing until the feature is completely finished"
      ],
      correctAnswer: "B: Create a feature branch and merge via pull request",
      explanation: "Feature branches keep the main branch stable while allowing code review before merging."
    },
    {
      question: "What is the purpose of unit testing?",
      options: [
        "A: To slow down development and add bureaucracy",
        "B: To verify individual components work as expected in isolation",
        "C: To replace manual testing completely",
        "D: To test the entire application at once"
      ],
      correctAnswer: "B: To verify individual components work as expected in isolation",
      explanation: "Unit tests ensure components work correctly on their own, making it easier to identify issues."
    }
  ];
}

function generateCodeBasedQuestions(codeChanges, commitMessage) {
  if (!codeChanges || codeChanges.length === 0) {
    console.log("No code changes to generate questions from");
    return [];
  }
  
  const questions = [];
  
  // First question is always about the commit purpose
  questions.push({
    question: `What is the purpose of the commit "${commitMessage.substring(0, 30)}${commitMessage.length > 30 ? '...' : ''}"?`,
    options: [
      "A: Adding new features",
      "B: Fixing bugs",
      "C: Refactoring code",
      "D: Updating documentation"
    ],
    correctAnswer: commitMessage.toLowerCase().includes('fix') ? 
                  "B: Fixing bugs" : 
                  "A: Adding new features",
    explanation: `Based on the commit message "${commitMessage}", this appears to be ${
      commitMessage.toLowerCase().includes('fix') ? 'fixing a bug' : 'adding new functionality'
    }.`
  });
  
  // Process up to 2 more significant code changes
  const significantChanges = codeChanges
    .filter(change => change.code.trim().length > 10)
    .slice(0, 2);
  
  for (const change of significantChanges) {
    const fileExt = change.file ? change.file.split('.').pop().toLowerCase() : '';
    const language = getLanguageFromExtension(fileExt);
    
    // Generate a question based on the type of code
    if (change.code.includes('function') || change.code.includes('def ') || 
        change.code.includes('=>') || change.code.includes('method')) {
      questions.push({
        question: `What is the likely purpose of this ${language} function?`,
        options: [
          "A: Process data and return a result",
          "B: Modify external state or resources",
          "C: Handle errors or exceptions",
          "D: Validate input parameters"
        ],
        correctAnswer: "A: Process data and return a result",
        explanation: `This function appears in ${change.file || 'the codebase'} and was modified in this commit.`
      });
    } else if (change.code.includes('class') || change.code.includes('interface')) {
      questions.push({
        question: `What is the purpose of this ${language} class?`,
        options: [
          "A: Encapsulate related data and behavior",
          "B: Implement an interface or protocol",
          "C: Extend functionality of a parent class",
          "D: Create a singleton instance"
        ],
        correctAnswer: "A: Encapsulate related data and behavior",
        explanation: `This class definition appears in ${change.file || 'the codebase'} and was modified in this commit.`
      });
    } else if (change.code.includes('if') || change.code.includes('else') || 
               change.code.includes('switch') || change.code.includes('case')) {
      questions.push({
        question: `What is this conditional logic likely checking for?`,
        options: [
          "A: Validating input data",
          "B: Handling an error condition",
          "C: Implementing business logic",
          "D: Optimizing performance"
        ],
        correctAnswer: "C: Implementing business logic",
        explanation: `This conditional logic appears in ${change.file || 'the codebase'} and was modified in this commit.`
      });
    } else if (change.code.includes('fetch') || change.code.includes('axios') || 
               change.code.includes('http') || change.code.includes('request')) {
      questions.push({
        question: `What is this code likely doing?`,
        options: [
          "A: Making an API request",
          "B: Processing local data",
          "C: Updating the user interface",
          "D: Configuring application settings"
        ],
        correctAnswer: "A: Making an API request",
        explanation: `This code appears to be making a network request and was modified in this commit.`
      });
    } else {
      // Generic code question
      questions.push({
        question: `What does this code change likely accomplish?`,
        options: [
          "A: Implements a new feature",
          "B: Fixes a bug or issue",
          "C: Refactors existing code",
          "D: Improves performance"
        ],
        correctAnswer: commitMessage.toLowerCase().includes('fix') ? 
                      "B: Fixes a bug or issue" : 
                      "A: Implements a new feature",
        explanation: `This code change was part of the commit "${commitMessage}" and affects ${change.file || 'the codebase'}.`
      });
    }
  }
  
  // If we couldn't generate enough questions, add a generic one
  if (questions.length < 3) {
    questions.push({
      question: "What is a best practice when making code changes?",
      options: [
        "A: Make large commits with many changes",
        "B: Make small, focused commits with clear messages",
        "C: Only commit when the entire feature is complete",
        "D: Avoid writing tests until the code is stable"
      ],
      correctAnswer: "B: Make small, focused commits with clear messages",
      explanation: "Small, focused commits are easier to review, understand, and revert if necessary."
    });
  }
  
  return questions;
}

/**
 * Generate questions based on commit message when no code changes are available
 * @param {string} commitMessage - The commit message
 * @returns {Array} - Array of questions
 */
function generateCommitMessageQuestions(commitMessage) {
  console.log('Generating questions based on commit message:', commitMessage);
  
  const questions = [];
  
  // First question about the commit purpose
  questions.push({
    question: `What is the purpose of the commit "${commitMessage.substring(0, 30)}${commitMessage.length > 30 ? '...' : ''}"?`,
    options: [
      "A: Adding new features",
      "B: Fixing bugs",
      "C: Refactoring code",
      "D: Updating documentation"
    ],
    correctAnswer: commitMessage.toLowerCase().includes('fix') ? 
                  "B: Fixing bugs" : 
                  "A: Adding new features",
    explanation: `Based on the commit message "${commitMessage}", this appears to be ${
      commitMessage.toLowerCase().includes('fix') ? 'fixing a bug' : 'adding new functionality'
    }.`
  });
  
  // Extract keywords from commit message
  const keywords = commitMessage.toLowerCase().split(/\s+/).filter(word => 
    word.length > 3 && !['the', 'and', 'for', 'with'].includes(word)
  );
  
  // Second question based on keywords in commit message
  if (keywords.length > 0) {
    // Check for specific types of changes based on keywords
    if (keywords.some(word => ['profile', 'picture', 'image', 'photo', 'avatar'].includes(word))) {
      questions.push({
        question: "What is a best practice for handling profile pictures in web applications?",
        options: [
          "A: Store images directly in the database as BLOBs",
          "B: Store images on the filesystem and references in the database",
          "C: Always use third-party image hosting services",
          "D: Avoid allowing users to upload custom images"
        ],
        correctAnswer: "B: Store images on the filesystem and references in the database",
        explanation: "Storing images on the filesystem with database references provides a good balance of performance and flexibility."
      });
    } else if (keywords.some(word => ['api', 'endpoint', 'request', 'response', 'fetch'].includes(word))) {
      questions.push({
        question: "What is a key consideration when designing API endpoints?",
        options: [
          "A: Making endpoints as generic as possible",
          "B: Using only GET requests for simplicity",
          "C: Following REST principles and using appropriate HTTP methods",
          "D: Returning all available data in every response"
        ],
        correctAnswer: "C: Following REST principles and using appropriate HTTP methods",
        explanation: "RESTful APIs use appropriate HTTP methods (GET, POST, PUT, DELETE) and follow consistent resource-oriented design."
      });
    } else if (keywords.some(word => ['ui', 'interface', 'design', 'layout', 'component'].includes(word))) {
      questions.push({
        question: "What is an important principle in UI design?",
        options: [
          "A: Using as many colors as possible to attract attention",
          "B: Consistency in design patterns and user interactions",
          "C: Maximizing the number of features visible at once",
          "D: Avoiding user testing until the final stages"
        ],
        correctAnswer: "B: Consistency in design patterns and user interactions",
        explanation: "Consistent design patterns help users learn the interface quickly and predict how to interact with new features."
      });
    } else {
      // Generic software development question
      questions.push({
        question: "What is a key principle of good software development?",
        options: [
          "A: Writing code quickly without planning",
          "B: Avoiding documentation to save time",
          "C: Writing maintainable, well-tested code",
          "D: Implementing all possible features at once"
        ],
        correctAnswer: "C: Writing maintainable, well-tested code",
        explanation: "Maintainable, well-tested code reduces bugs and makes future development easier and faster."
      });
    }
  }
  
  // Third question - general software development best practice
  questions.push({
    question: "What is a best practice when making code changes?",
    options: [
      "A: Make large commits with many changes",
      "B: Make small, focused commits with clear messages",
      "C: Only commit when the entire feature is complete",
      "D: Avoid writing tests until the code is stable"
    ],
    correctAnswer: "B: Make small, focused commits with clear messages",
    explanation: "Small, focused commits are easier to review, understand, and revert if necessary."
  });
  
  return questions;
}

const getMyQuizAttempts = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.userId; // From verifyToken middleware

    // Validate taskId
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({ message: "Invalid task ID format" });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Extract only the attempts made by the current user
    const attempts = task.quizzes.flatMap(quiz => 
      quiz.attempts
        .filter(attempt => attempt.userId.toString() === userId)
        .map(attempt => ({
          quizId: quiz._id,
          createdAt: quiz.createdAt,
          score: attempt.score,
          passed: attempt.passed,
          completedAt: attempt.completedAt,
          results: attempt.results
        }))
    ).sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

    res.status(200).json({ message: "Quiz attempts retrieved", attempts });
  } catch (error) {
    console.error("Error fetching quiz attempts:", error);
    res.status(500).json({ message: "Error fetching quiz attempts", error: error.message });
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
  generateQuiz,
  submitQuiz,
  getQuizAnalytics,
  getMyQuizAttempts,
};
