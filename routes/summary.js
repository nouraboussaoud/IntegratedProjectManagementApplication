const express = require('express');
const router = express.Router();
const axios = require('axios');
const pdfParse = require('pdf-parse');
const tesseract = require('tesseract.js');
const stringSimilarity = require('string-similarity');
const Deliverable = require('../models/Deliverable');

// Download PDF from URL
const downloadPDF = async (url) => {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  return Buffer.from(response.data, 'binary');
};

// Clean and normalize text
const cleanExtractedText = (text) => {
  return text
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[^\x00-\x7F]/g, '')
    .trim();
};

// OCR fallback for image-based PDFs
const extractTextWithOCR = async (buffer) => {
  const imageBuffer = Buffer.from(buffer);
  const { data: { text } } = await tesseract.recognize(imageBuffer, 'eng');
  return text;
};

// Call Hugging Face summarization model
const getSummaryFromHuggingFace = async (text) => {
  const truncatedText = text.slice(0, 2500);
  const response = await axios.post(
    'https://api-inference.huggingface.co/models/facebook/bart-large-cnn',
    { inputs: truncatedText },
    {
      headers: {
        Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
      },
    }
  );
  return response.data[0]?.summary_text || 'Résumé non disponible';
};

// Fallback: take first 3 sentences
const createBasicSummary = (text) => {
  const sentences = text.match(/[^.!?]+[.!?]+/g);
  return sentences?.slice(0, 3).join(' ') || text.slice(0, 400);
};

// Calculate plagiarism score
const calculatePlagiarismScore = (currentText, existingTexts) => {
  let highestScore = 0;
  existingTexts.forEach(existingText => {
    const similarity = stringSimilarity.compareTwoStrings(currentText, existingText);
    if (similarity > highestScore) {
      highestScore = similarity;
    }
  });
  return Math.round(highestScore * 100);
};

// Get all other texts from DB except current
const getExistingTextsFromDatabase = async (currentFileUrl) => {
  const deliverables = await Deliverable.find({ 'file.url': { $exists: true } });
  const texts = [];

  for (const deliverable of deliverables) {
    try {
      let url = deliverable.file.url;
      if (!url || url === currentFileUrl) continue; // Skip current

      if (url.includes('cloudinary.com')) {
        url = url.replace(/\?.*$/, '') + '?fl_attachment=true';
      }

      const buffer = await downloadPDF(url);
      let data = await pdfParse(buffer);
      let text = data.text;

      if (text.length < 500) {
        text = await extractTextWithOCR(buffer);
      }

      texts.push(cleanExtractedText(text));
    } catch (err) {
      console.error(`Error processing file ${deliverable.file.url}:`, err);
    }
  }

  return texts;
};

// Main route
router.post('/', async (req, res) => {
  const { fileUrl } = req.body;

  if (!fileUrl) {
    return res.status(400).json({ error: 'fileUrl is required' });
  }

  let pdfUrl = fileUrl;
  if (pdfUrl.includes('cloudinary.com')) {
    pdfUrl = pdfUrl.replace(/\?.*$/, '') + '?fl_attachment=true';
  }

  try {
    const buffer = await downloadPDF(pdfUrl);
    let data = await pdfParse(buffer);
    let text = data.text;

    if (text.length < 500) {
      console.warn('PDF appears to be image-based. Using OCR.');
      text = await extractTextWithOCR(buffer);
    }

    const cleanedText = cleanExtractedText(text);

    // 1. Get existing texts (excluding current)
    const existingTexts = await getExistingTextsFromDatabase(fileUrl);

    // 2. Compute similarity score
    const plagiarismScore = calculatePlagiarismScore(cleanedText, existingTexts);

    // 3. Try Hugging Face summary
    try {
      const summary = await getSummaryFromHuggingFace(cleanedText);
      return res.json({
        summary,
        plagiarismScore,
        plagiarized: plagiarismScore > 30,
        usedFallback: false
      });
    } catch (err) {
      console.error('Hugging Face error:', err.message);
      const fallback = createBasicSummary(cleanedText);
      return res.json({
        summary: fallback,
        plagiarismScore,
        plagiarized: plagiarismScore > 30,
        usedFallback: true,
        note: 'Used fallback summarization due to Hugging Face API error'
      });
    }

  } catch (err) {
    console.error('Error processing summary:', err);
    res.status(500).json({ error: `Failed to process file: ${err.message}` });
  }
});

module.exports = router;
