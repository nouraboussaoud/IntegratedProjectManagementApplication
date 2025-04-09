const fs = require("fs");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const path = require("path");
const axios = require("axios");
const Deliverable = require("../models/Deliverable");
require("dotenv").config();

// Fonction améliorée pour extraire le texte depuis n'importe quel fichier
const extractTextFromFile = async (filePath) => {
  console.log(`[extractTextFromFile] Starting extraction for file: ${filePath}`);
  const ext = path.extname(filePath).toLowerCase().replace('.', '');

  try {
    let result;
    // PDF
    if (ext === "pdf") {
      console.log("[extractTextFromFile] Processing PDF file");
      const buffer = fs.readFileSync(filePath);
      const data = await pdfParse(buffer);
      result = data.text;
    // DOCX
    } else if (ext === "docx") {
      console.log("[extractTextFromFile] Processing DOCX file");
      const buffer = fs.readFileSync(filePath);
      const extractionResult = await mammoth.extractRawText({ buffer });
      result = extractionResult.value;
    // TXT, CSV, JSON, XML, HTML, etc.
    } else if (["txt", "csv", "json", "xml", "html", "md"].includes(ext)) {
      console.log(`[extractTextFromFile] Processing ${ext.toUpperCase()} file`);
      result = fs.readFileSync(filePath, "utf8");
    // Others: Try reading as text (might fail on binary)
    } else {
      console.log("[extractTextFromFile] Attempting to process as generic text file");
      result = fs.readFileSync(filePath, "utf8");
    }

    console.log(`[extractTextFromFile] Successfully extracted text (length: ${result.length})`);
    return result;
  } catch (err) {
    console.error(`[extractTextFromFile] Error processing file: ${err.message}`);
    throw new Error("Unsupported or binary file type. Cannot extract text.");
  }
};

// Contrôleur principal
const aiDetection = async (req, res) => {
  console.log("[aiDetection] Starting AI detection process");
  try {
    const { deliverableId } = req.params;
    console.log(`[aiDetection] Looking for deliverable with ID: ${deliverableId}`);

    const deliverable = await Deliverable.findById(deliverableId);
    if (!deliverable) {
      console.error(`[aiDetection] Deliverable not found for ID: ${deliverableId}`);
      return res.status(404).json({ message: "Deliverable not found" });
    }

    const filePath = deliverable.file;
    console.log(`[aiDetection] Found deliverable with file path: ${filePath}`);

    // Extract text from file
    let extractedText;
    try {
      extractedText = await extractTextFromFile(filePath);
      console.log(`[aiDetection] Text extraction successful (sample: ${extractedText.substring(0, 50)}...)`);
    } catch (extractError) {
      console.error(`[aiDetection] Text extraction failed: ${extractError.message}`);
      return res.status(400).json({ message: "Error extracting text from file", error: extractError.message });
    }

    // Call Hugging Face API
    console.log("[aiDetection] Preparing to call Hugging Face API");
    const textToAnalyze = extractedText.slice(0, 2000); // Limiting to 2000 chars
    console.log(`[aiDetection] Analyzed text length: ${textToAnalyze.length} chars`);

    if (!process.env.HUGGINGFACE_API_KEY) {
      console.error("[aiDetection] Missing Hugging Face API key");
      return res.status(500).json({ message: "Server configuration error" });
    }

    try {
      console.log("[aiDetection] Calling Hugging Face API...");
      const hfResponse = await axios.post(
        "https://huggingface.co/jpwahle/longformer-base-plagiarism-detection",
        { inputs: textToAnalyze },
        {
          headers: {
            Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
            "Content-Type": "application/json",
          },
          timeout: 30000 // 30 seconds timeout
        }
      );

      console.log("[aiDetection] Hugging Face API response received");
      console.debug(`[aiDetection] Full API response: ${JSON.stringify(hfResponse.data, null, 2)}`);

      const aiScore = hfResponse.data?.[0]?.score ?? 0;
      console.log(`[aiDetection] Calculated AI score: ${aiScore}`);

      res.status(200).json({
        message: "AI Detection complete",
        ai_probability: `${(aiScore * 100).toFixed(2)}%`,
        isLikelyAI: aiScore > 0.3,
      });
    } catch (apiError) {
      console.error(`[aiDetection] Hugging Face API error: ${apiError.message}`);
      if (apiError.response) {
        console.error(`[aiDetection] API response error: ${apiError.response.status} - ${JSON.stringify(apiError.response.data)}`);
      }
      res.status(500).json({ 
        message: "Error calling AI detection service", 
        error: apiError.message,
        details: apiError.response?.data || null
      });
    }
  } catch (error) {
    console.error(`[aiDetection] Unexpected error: ${error.message}`);
    console.error(error.stack);
    res.status(500).json({ 
      message: "Error during AI detection", 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

module.exports = { aiDetection };