const axios = require('axios'); // Import Axios
const Progress = require('../models/Progress');
const Task = require('../models/Task');

// Function to call the Flask API for delay prediction
const predictDelay = async (dates, values, completionPercentage) => {
  try {
    // Ensure that the completionPercentage is passed to the request
    if (completionPercentage === undefined) {
      throw new Error("completionPercentage is required");
    }

    // Log the payload to ensure the correct parameters are passed
    console.log("Request Payload:", {
      ds: dates,  // Dates passed dynamically
      y: values,  // Values passed dynamically
      completionPercentage: completionPercentage  // Completion percentage passed dynamically
    });

    // Send request to Flask endpoint
    const response = await axios.post('http://localhost:5000/predict', {
      ds: dates,
      y: values,
      completionPercentage: completionPercentage
    });

    // Log the response data
    console.log('Flask Response:', response.data);

    // Assuming the response contains prediction data
    if (response.data && response.data.length > 0) {
      // Assuming we are interested in the last predicted 'yhat'
      const predictedDelay = response.data[response.data.length - 1].yhat;
      console.log("Predicted Delay:", predictedDelay); // Log the predicted delay
      return predictedDelay;
    }

    throw new Error("No valid prediction data received from Flask model");
    
  } catch (error) {
    // Log the error message for better debugging
    console.error('Error calling Flask model:', error.response ? error.response.data : error.message);
    throw new Error('Error predicting delay from Flask model');
  }
};


exports.addOrUpdateProgress = async (req, res) => {
  try {
    const { taskId, status, completionPercentage } = req.body;
    const studentId = req.userId;

    if (!studentId) {
      return res.status(401).json({ error: 'Unauthorized: Student ID missing' });
    }

    // Validate if taskId exists in Task collection
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(400).json({ error: 'Task not found' });
    }

    // Define your dates and values, you might retrieve them from the task or database
    const dates = ["2025-03-26", "2025-03-27", "2025-03-28"];  // Example static dates
    const values = [10, 15, 20];  // Example static values

    // Predict delay using Flask model
    console.log("Calling AI model for delay prediction...");
    const predictedDelay = await predictDelay(dates, values, completionPercentage); // Pass all 3 parameters
    console.log("Predicted Delay:", predictedDelay); // Log the AI prediction

    // Add or update progress entry
    let progress = await Progress.findOneAndUpdate(
      { studentId, taskId },
      { status, completionPercentage, predictedDelay, updatedAt: Date.now() },
      { new: true, upsert: true }
    );

    if (!progress) {
      return res.status(400).json({ error: 'Error adding or updating progress' });
    }

    res.status(200).json(progress);

  } catch (err) {
    console.error('Error updating or adding progress:', err);
    res.status(400).json({ error: 'Error updating or adding progress' });
  }
};


// Get Progress for a Student
exports.getProgressByStudent = async (req, res) => {
  try {
    const progress = await Progress.find({ studentId: req.params.studentId })
      .populate('taskId'); // Populate task details from Task collection

    if (!progress.length) {
      return res.status(404).json({ message: 'No progress found for this student' });
    }

    res.status(200).json(progress);
  } catch (err) {
    res.status(400).json({ error: 'Error fetching progress' });
  }
};
