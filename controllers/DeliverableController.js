const axios = require("axios");
const Deliverable = require('../models/Deliverable');
const fs = require("fs");
const path = require("path");

// Create Deliverable
const createDeliverable = async (req, res) => {
  try {
    // Ensure the user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized: Invalid token" });
    }

    // Extract the required fields from the request body
    const { title, description, github_commit_url } = req.body;
    const file = req.file; // Ensure the file is received as part of the form-data

    // Validate the required fields
    if (!title || !description || !file || !github_commit_url) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Create a new deliverable
    const newDeliverable = new Deliverable({
      title,
      student_id: req.user.id, // Automatically assign the student_id based on logged-in user
      description,
      file: file.path, // Save the file path
      github_commit_url,
      status: 'pending', // Initial status is pending
    });

    await newDeliverable.save();

    res.status(201).json({ message: "Deliverable created successfully", deliverable: newDeliverable });
  } catch (error) {
    console.error("Error creating deliverable:", error);
    res.status(500).json({ message: "Error creating deliverable" });
  }
};

// Get Deliverables History
const getDeliverablesHistory = async (req, res) => {
  try {
    const deliverables = await Deliverable.find({ student_id: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json({ deliverables });
  } catch (error) {
    console.error("Error fetching deliverables history:", error);
    res.status(500).json({ message: "Error fetching deliverables history" });
  }
};

// Get Commits for a Repository
const getCommits = async (req, res) => {
  const { repo, branch } = req.params;
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const headers = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
  };

  try {
    const response = await axios.get(`https://api.github.com/repos/${repo}/commits?sha=${branch}`, { headers });
    res.status(200).json({ commits: response.data });
  } catch (error) {
    console.error("Error fetching commits:", error);
    res.status(500).json({ message: "Error fetching commits" });
  }
};

// Get Branches for a Repository
const getBranches = async (req, res) => {
  const { repo } = req.params;
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const headers = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
  };

  try {
    const response = await axios.get(`https://api.github.com/repos/${repo}/branches`, { headers });
    res.status(200).json({ branches: response.data });
  } catch (error) {
    console.error("Error fetching branches:", error);
    res.status(500).json({ message: "Error fetching branches" });
  }
};

// Get Repositories of the authenticated user
const getRepositories = async (req, res) => {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const headers = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
  };

  try {
    const response = await axios.get('https://api.github.com/user/repos?per_page=100&type=all', { headers });
    res.status(200).json({ repositories: response.data });
  } catch (error) {
    console.error("Error fetching repositories:", error);
    res.status(500).json({ message: "Error fetching repositories" });
  }
};

// ... (existing imports and methods)

// Submit Evaluation
const submitEvaluation = async (req, res) => {
    try {
      const { deliverableId } = req.params;
      const { score, checklist, rubricScores, notes } = req.body;
  
      const deliverable = await Deliverable.findById(deliverableId);
      if (!deliverable) {
        return res.status(404).json({ message: "Deliverable not found" });
      }
  
      // Update evaluation data
      deliverable.evaluation = {
        score,
        notes,
        checklist,
        rubricScores,
        evaluated_by: req.user.id,
        evaluated_at: new Date()
      };
      deliverable.status = 'evaluated';
  
      await deliverable.save();
  
      res.status(200).json({ 
        message: "Evaluation submitted successfully",
        deliverable 
      });
    } catch (error) {
      console.error("Error submitting evaluation:", error);
      res.status(500).json({ message: "Error submitting evaluation" });
    }
  };
  
  // Get Evaluation
  const getEvaluation = async (req, res) => {
    try {
      const { deliverableId } = req.params;
      const deliverable = await Deliverable.findById(deliverableId);
  
      if (!deliverable) {
        return res.status(404).json({ message: "Deliverable not found" });
      }
  
      res.status(200).json({ 
        evaluation: deliverable.evaluation 
      });
    } catch (error) {
      console.error("Error fetching evaluation:", error);
      res.status(500).json({ message: "Error fetching evaluation" });
    }
  };
  
  // ... (existing exports)
  module.exports = {
    createDeliverable,
    getDeliverablesHistory,
    getCommits,
    getBranches,
    getRepositories,
    submitEvaluation,
    getEvaluation
  };