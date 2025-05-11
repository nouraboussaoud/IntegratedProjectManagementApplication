const axios = require('axios');
const Deliverable = require('../models/Deliverable');
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;

// Extract text from a PDF file
const extractTextFromPdf = async (filePath) => {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF');
  }
};

// Extract text from a DOCX file
const extractTextFromDocx = async (filePath) => {
  try {
    const result = await mammoth.extractRawText({
      path: filePath
    });
    return result.value;
  } catch (error) {
    console.error('Error extracting text from DOCX:', error);
    throw new Error('Failed to extract text from DOCX');
  }
};

// Analyze text using Hugging Face API for AI detection
const analyzeTextWithHuggingFace = async (text) => {
  try {
    const response = await axios.post(
      'https://api-inference.huggingface.co/models/roberta-base-openai-detector',
      { inputs: text.substring(0, 2000) }, // Most APIs have input limits
      {
        headers: {
          Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Sample response:
    // [{"label": "REAL", "score": 0.92}, {"label": "FAKE", "score": 0.08}]
    const results = response.data[0];
    
    // Find the FAKE score (AI-generated) and return it
    const fakeResult = results.find(item => item.label === 'FAKE');
    return fakeResult ? fakeResult.score : 0;
  } catch (error) {
    console.error('Error analyzing text with Hugging Face:', error);
    throw new Error('Failed to analyze text for AI detection');
  }
};

// Function to check text for plagiarism
// This is a placeholder - in a real application you would use a service like Copyleaks, Turnitin, etc.
const checkPlagiarism = async (text) => {
  // Placeholder implementation
  // In a real scenario, you would call an external API or use a library
  
  // For now, we'll return random scores for demonstration
  return Math.random() * 0.6; // Return a random score between 0 and 0.6
};

// Analyze a deliverable for AI-generated content
const analyzeAiContent = async (req, res) => {
  try {
    const { deliverableId } = req.params;
    
    // Find the deliverable
    const deliverable = await Deliverable.findById(deliverableId);
    if (!deliverable) {
      return res.status(404).json({ message: 'Deliverable not found' });
    }
    
    // Get the file path
    const filePath = path.join(__dirname, '..', deliverable.file);
    
    // Extract text based on file type
    let text;
    if (filePath.endsWith('.pdf')) {
      text = await extractTextFromPdf(filePath);
    } else if (filePath.endsWith('.docx')) {
      text = await extractTextFromDocx(filePath);
    } else {
      return res.status(400).json({ message: 'Unsupported file format' });
    }
    
    // Analyze the text
    const aiProbability = await analyzeTextWithHuggingFace(text);
    
    // Return the result
    res.status(200).json({ ai_probability: aiProbability });
  } catch (error) {
    console.error('Error analyzing AI content:', error);
    res.status(500).json({ message: 'Error analyzing content', error: error.message });
  }
};

// Analyze directly provided text for AI detection
const analyzeProvidedText = async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || text.trim().length < 100) {
      return res.status(400).json({ message: 'Text is too short for analysis' });
    }
    
    // Analyze the text
    const aiProbability = await analyzeTextWithHuggingFace(text);
    
    // Return the result
    res.status(200).json({ ai_probability: aiProbability });
  } catch (error) {
    console.error('Error analyzing provided text:', error);
    res.status(500).json({ message: 'Error analyzing text', error: error.message });
  }
};

// Check a deliverable for plagiarism
const checkDeliverablePlagiarism = async (req, res) => {
  try {
    const { deliverableId } = req.params;
    
    // Find the deliverable
    const deliverable = await Deliverable.findById(deliverableId);
    if (!deliverable) {
      return res.status(404).json({ message: 'Deliverable not found' });
    }
    
    // Get the file path
    const filePath = path.join(__dirname, '..', deliverable.file);
    
    // Extract text based on file type
    let text;
    if (filePath.endsWith('.pdf')) {
      text = await extractTextFromPdf(filePath);
    } else if (filePath.endsWith('.docx')) {
      text = await extractTextFromDocx(filePath);
    } else {
      return res.status(400).json({ message: 'Unsupported file format' });
    }
    
    // Check for plagiarism
    const plagiarismScore = await checkPlagiarism(text);
    
    // Return the result
    res.status(200).json({ plagiarism_score: plagiarismScore });
  } catch (error) {
    console.error('Error checking plagiarism:', error);
    res.status(500).json({ message: 'Error checking plagiarism', error: error.message });
  }
};

// Check provided text for plagiarism
const checkProvidedTextPlagiarism = async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || text.trim().length < 100) {
      return res.status(400).json({ message: 'Text is too short for analysis' });
    }
    
    // Check for plagiarism
    const plagiarismScore = await checkPlagiarism(text);
    
    // Return the result
    res.status(200).json({ plagiarism_score: plagiarismScore });
  } catch (error) {
    console.error('Error checking plagiarism in provided text:', error);
    res.status(500).json({ message: 'Error checking plagiarism', error: error.message });
  }
};

module.exports = {
  analyzeAiContent,
  analyzeProvidedText,
  checkDeliverablePlagiarism,
  checkProvidedTextPlagiarism
};