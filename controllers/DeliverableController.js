const axios = require("axios");
const Deliverable = require('../models/Deliverable');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

// Add at the top of your DeliverableController.js
console.log('Cloudinary environment variables in controller:', {
  cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  apiKey: process.env.CLOUDINARY_API_KEY,
  apiSecret: process.env.CLOUDINARY_API_SECRET
});

// Configure Cloudinary
// Configure Cloudinary
const stream = require('stream');
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Modified createDeliverable
const createDeliverable = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized: Invalid token" });
    }

    const { title, description, github_commit_url } = req.body;
    const file = req.file;

    if (!title || !description || !file || !github_commit_url) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(file.path, {
      folder: 'deliverables',
      resource_type: 'auto'
    });

    const newDeliverable = new Deliverable({
      title,
      student_id: req.user.id,
      description,
      file: {
        url: result.secure_url,
        public_id: result.public_id
      },
      github_commit_url,
      status: 'pending',
    });

    await newDeliverable.save();

    // Clean up the temporary file (now with proper fs import)
    fs.unlinkSync(file.path);

    res.status(201).json({ 
      message: "Deliverable created successfully", 
      deliverable: newDeliverable 
    });
  } catch (error) {
    console.error("Error creating deliverable:", error);
    res.status(500).json({ message: "Error creating deliverable" });
  }
};

// Simplified getFile (now just redirects to Cloudinary URL)
const getFile = async (req, res) => {
  try {
    const { deliverableId } = req.params;
    const deliverable = await Deliverable.findById(deliverableId);
    
    if (!deliverable) {
      return res.status(404).json({ message: "Deliverable not found" });
    }

    if (!deliverable.file?.public_id) {
      return res.status(404).json({ message: "No file associated with this deliverable" });
    }

    // Option 1: Redirect to Cloudinary URL (simplest and most efficient)
    const pdfUrl = cloudinary.url(deliverable.file.public_id, {
      secure: true,
      resource_type: 'raw',
      sign_url: true,
      expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
      flags: 'attachment',
      filename_override: deliverable.file.originalname
    });

    return res.redirect(pdfUrl);

    /* 
    // Option 2: Stream the file through your server (if you need processing)
    const pdfStream = cloudinary.api.resource(deliverable.file.public_id, {
      resource_type: 'raw',
      type: 'upload',
      stream: true
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${deliverable.file.originalname}"`);
    
    pdfStream.on('error', (err) => {
      console.error('Stream error:', err);
      res.status(500).end();
    });

    pdfStream.pipe(res);
    */

  } catch (error) {
    console.error("Error fetching file:", error);
    res.status(500).json({ 
      message: "Error fetching file",
      error: error.message 
    });
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

// Submit Evaluation
const submitEvaluation = async (req, res) => {
  try {
    const { deliverableId } = req.params;
    const { evaluationScore, notes } = req.body; // Changed 'score' to 'evaluationScore'

    const deliverable = await Deliverable.findById(deliverableId);
    if (!deliverable) {
      return res.status(404).json({ message: "Deliverable not found" });
    }

    // Update evaluation data
    deliverable.evaluation = {
      evaluationScore, // Use evaluationScore to match the schema
      notes,
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

   /**
 * Fetch all deliverables from the database with optional filtering/sorting.
 * @param {Object} req - Express request object (can include query params for filtering)
 * @param {Object} res - Express response object
 */
const getAllDeliverables = async (req, res) => {
  try {
    // Extract query parameters (for filtering/sorting)
    const { 
      status, 
      student_id, 
      sortBy = 'submission_date', 
      sortOrder = 'desc' 
    } = req.query;

    // Build the query
    const query = {};
    if (status) query.status = status;
    if (student_id) query.student_id = student_id;

    // Fetch deliverables with sorting
    const deliverables = await Deliverable.find(query)
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .populate('student_id', 'name email'); // Populate student details (optional)

    if (!deliverables || deliverables.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: "No deliverables found.",
      });
    }

    res.status(200).json({
      success: true,
      count: deliverables.length,
      data: deliverables,
    });

  } catch (error) {
    console.error("Error fetching deliverables:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch deliverables",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

module.exports = {
  createDeliverable,
  getDeliverablesHistory,
  getCommits,
  getBranches,
  getRepositories,
  submitEvaluation,
  getEvaluation,
  getFile,
  getAllDeliverables
};