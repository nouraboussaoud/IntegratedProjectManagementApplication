const express = require('express');
const router = express.Router();
const axios = require('axios');
const pdfParse = require('pdf-parse');
const tesseract = require('tesseract.js');
const Deliverable = require('../models/Deliverable');
const fs = require('fs');
const path = require('path');
const gtts = require('gtts');

// Download PDF from URL
const downloadPDF = async (url) => {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  return Buffer.from(response.data, 'binary');
};

// Clean and normalize text - specialized for French technical reports
const cleanExtractedText = (text) => {
  let result = text
    .replace(/\n/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/["'"`]/g, ' ')
    .replace(/\$\d+/g, '')
    .trim();

  const wordBoundaryFixPatterns = [
    { pattern: /(Rapport)(du)/gi, replacement: '$1 $2' },
    { pattern: /(sécurité|securite)(informatique)/gi, replacement: '$1 $2' },
    { pattern: /(module)(sécurité|securite)/gi, replacement: '$1 $2' },
    { pattern: /(Réalisé|Realise)(et)/gi, replacement: '$1 $2' },
    { pattern: /(et)(présenté|presente)/gi, replacement: '$1 $2' },
    { pattern: /(présenté|presente)(par)/gi, replacement: '$1 $2' },
    { pattern: /(Encadré|Encadre)(par)/gi, replacement: '$1 $2' },
    { pattern: /(Année|Annee)(universitaire)/gi, replacement: '$1 $2' },
    { pattern: /(universitaire)(:)(\d)/gi, replacement: '$1$2 $3' },
    { pattern: /(Fascicule)(\d+)/gi, replacement: '$1 $2' },
    { pattern: /(Fascicule\s\d+)(:)/gi, replacement: '$1$2 ' },
    { pattern: /(Préparation|Preparation)(de)/gi, replacement: '$1 $2' },
    { pattern: /(de)(l')/gi, replacement: '$1 $2' },
    { pattern: /(l')(environnement)/gi, replacement: '$1$2' },
    { pattern: /(environnement)(de)/gi, replacement: '$1 $2' },
    { pattern: /(de)(travail)/gi, replacement: '$1 $2' },
    { pattern: /(travail)(et)/gi, replacement: '$1 $2' },
    { pattern: /(et)(analyse)/gi, replacement: '$1 $2' },
    { pattern: /(analyse)(des)/gi, replacement: '$1 $2' },
    { pattern: /(des)(vulnérabilités|vulnerabilites)/gi, replacement: '$1 $2' },
    { pattern: /(Partie)(\d+)/gi, replacement: '$1 $2' },
    { pattern: /(Partie\s\d+)(:)/gi, replacement: '$1$2 ' },
    { pattern: /(Déjà|Deja)(faite)/gi, replacement: '$1 $2' },
    { pattern: /(Scan)(Nmap)/gi, replacement: '$1 $2' },
    { pattern: /(=>)(On)/gi, replacement: '$1 $2' },
    { pattern: /(On)(a)/gi, replacement: '$1 $2' },
    { pattern: /(a)(utilisé|utilise)/gi, replacement: '$1 $2' },
    { pattern: /(utilisé|utilise)(la)/gi, replacement: '$1 $2' },
    { pattern: /(la)(commande)/gi, replacement: '$1 $2' },
    { pattern: /(commande)(ifconfig)/gi, replacement: '$1 $2' },
    { pattern: /(ifconfig)(pour)/gi, replacement: '$1 $2' },
    { pattern: /(pour)(obtenir)/gi, replacement: '$1 $2' },
    { pattern: /(obtenir)(l')/gi, replacement: '$1 $2' },
    { pattern: /(l')(adresse)/gi, replacement: '$1$2' },
    { pattern: /(adresse)(IP)/gi, replacement: '$1 $2' },
    { pattern: /(IP)(de)/gi, replacement: '$1 $2' },
    { pattern: /(de)(notre)/gi, replacement: '$1 $2' },
    { pattern: /(notre)(machine)/gi, replacement: '$1 $2' },
    { pattern: /(machine)(et)/gi, replacement: '$1 $2' },
    { pattern: /(et)(le)/gi, replacement: '$1 $2' },
    { pattern: /(le)(masque)/gi, replacement: '$1 $2' },
    { pattern: /(masque)(de)/gi, replacement: '$1 $2' },
    { pattern: /(de)(sous)/gi, replacement: '$1 $2' },
    { pattern: /(sous)(-)/gi, replacement: '$1$2' },
    { pattern: /(-)(réseau|reseau)/gi, replacement: '$1$2' },
    { pattern: /(IP)(\d+)/gi, replacement: '$1 $2' },
  ];

  for (const { pattern, replacement } of wordBoundaryFixPatterns) {
    result = result.replace(pattern, replacement);
  }

  result = result
    .replace(/(\w)([,.:;!?])(\w)/g, '$1$2 $3')
    .replace(/(\w)(-)(\w)/g, '$1 - $3')
    .replace(/(\w)(\/|\\)(\w)/g, '$1 / $3')
    .replace(/(\d+)\.(\d+)\.(\d+)\.(\d+)/g, '$1.$2.$3.$4')
    .replace(/(T P \d+) - (T P \d+)/g, '$1-$2')
    .replace(/●/g, '• ');

  return result;
};

// OCR fallback for image-based PDFs
const extractTextWithOCR = async (buffer) => {
  const imageBuffer = Buffer.from(buffer);
  const { data: { text } } = await tesseract.recognize(imageBuffer, 'fra+eng');
  return text;
};

// Extractive summarization
const extractiveSummarization = (text, maxSentences = 5) => {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text.slice(0, 500)];
  const scoredSentences = sentences.map((sentence, index) => {
    const words = sentence.trim().split(/\s+/).length;
    const positionScore = 1 - index / sentences.length;
    const lengthScore = Math.min(words / 50, 1);
    return { sentence, score: positionScore * 0.6 + lengthScore * 0.4 };
  });

  const topSentences = scoredSentences
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(maxSentences, sentences.length))
    .map(s => s.sentence);

  let summary = topSentences.join(' ');

  summary = cleanExtractedText(summary)
    .replace(/\bTP\s(\d+)/gi, 'T P $1')
    .replace(/\bVM\b/g, 'V M')
    .replace(/\bOS\b/g, 'O S')
    .replace(/\bSSH\b/g, 'S S H')
    .replace(/\bHTTP\b/g, 'H T T P')
    .replace(/\bIP\b/g, 'I P')
    .replace(/(\d+)\.(\d+)\.(\d+)\.(\d+)/g, '$1 point $2 point $3 point $4')
    .replace(/\b(\d{1,3})\.(\d{1,3})\b/g, '$1 virgule $2')
    .replace(/(\d)(-|\/)(\d)/g, '$1 $2 $3')
    .replace(/\.\s+/g, '. ')
    .replace(/\?\s+/g, '? ')
    .replace(/!\s+/g, '! ');

  return summary;
};

// Generate audio using gTTS
const generateAudio = (text, language) => {
  return new Promise((resolve, reject) => {
    const audioDir = path.join(__dirname, '../audio');
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir);
    }

    const audioFileName = `summary_${Date.now()}.mp3`;
    const audioPath = path.join(audioDir, audioFileName);

    // Detect language (default to 'en' if not French)
    const lang = /[\u00C0-\u017Fàâäéèêëîïôœùûüç]/.test(text) ? 'fr' : 'en';
    const tts = new gtts(text.slice(0, 2000), lang); // Limit to 2000 chars to stay within free tier

    tts.save(audioPath, (err) => {
      if (err) {
        console.error('Error generating audio:', err);
        reject(new Error('Failed to generate audio'));
      } else {
        resolve(`/audio/${audioFileName}`);
      }
    });
  });
};

// Simple word vectorization for cosine similarity
const getWordVector = (text) => {
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const vector = {};
  words.forEach(word => {
    vector[word] = (vector[word] || 0) + 1;
  });
  return vector;
};

// Custom cosine similarity function
const cosineSimilarity = (vec1, vec2) => {
  const allWords = new Set([...Object.keys(vec1), ...Object.keys(vec2)]);
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (const word of allWords) {
    const v1 = vec1[word] || 0;
    const v2 = vec2[word] || 0;
    dotProduct += v1 * v2;
    norm1 += v1 * v1;
    norm2 += v2 * v2;
  }

  norm1 = Math.sqrt(norm1);
  norm2 = Math.sqrt(norm2);

  if (norm1 === 0 || norm2 === 0) return 0;
  return dotProduct / (norm1 * norm2);
};

// Find similar sections between two texts (optimized)
const findSimilarSections = (text1, text2, minSimilarity = 0.8, maxSentences = 50) => {
  const sentences1 = (text1.match(/[^.!?]+[.!?]+/g) || []).slice(0, maxSentences);
  const sentences2 = (text2.match(/[^.!?]+[.!?]+/g) || []).slice(0, maxSentences);
  const similarSections = [];

  const sampleSize = Math.min(10, sentences1.length);
  const sampledIndices = Array.from({ length: sentences1.length }, (_, i) => i)
    .sort(() => Math.random() - 0.5)
    .slice(0, sampleSize);

  sampledIndices.forEach(i => {
    const s1 = sentences1[i];
    sentences2.forEach(s2 => {
      const similarity = cosineSimilarity(getWordVector(s1), getWordVector(s2));
      if (similarity >= minSimilarity) {
        similarSections.push({
          original: s1.trim(),
          matched: s2.trim(),
          similarity: Math.round(similarity * 100),
        });
      }
    });
  });

  return similarSections.slice(0, 5);
};

// Calculate plagiarism score and details (optimized with batch processing)
const calculatePlagiarismScore = async (currentText, existingDocs) => {
  let highestScore = 0;
  const matches = [];
  const batchSize = 10;

  for (let i = 0; i < existingDocs.length; i += batchSize) {
    const batch = existingDocs.slice(i, i + batchSize);
    const batchPromises = batch.map(async ({ text, url }) => {
      const similarity = cosineSimilarity(getWordVector(currentText), getWordVector(text));
      const score = Math.round(similarity * 100);

      if (score > 10) {
        const similarSections = findSimilarSections(currentText, text);
        return {
          documentUrl: url,
          similarityScore: score,
          similarSections,
        };
      }
      return null;
    });

    const batchResults = (await Promise.all(batchPromises)).filter(result => result !== null);
    matches.push(...batchResults);

    const batchMaxScore = Math.max(...batchResults.map(r => r?.similarityScore || 0));
    if (batchMaxScore > highestScore) {
      highestScore = batchMaxScore;
    }
  }

  return {
    overallScore: highestScore,
    matches: matches.sort((a, b) => b.similarityScore - a.similarityScore).slice(0, 3),
  };
};

// Get existing texts from database with caching
const getExistingTextsFromDatabase = async (currentFileUrl) => {
  const deliverables = await Deliverable.find({ 'file.url': { $exists: true } });
  const texts = [];

  for (const deliverable of deliverables) {
    try {
      let url = deliverable.file.url;
      if (!url || url === currentFileUrl) continue;

      if (url.includes('cloudinary.com')) {
        url = url.replace(/\?.*$/, '') + '?fl_attachment=true';
      }

      let text = deliverable.cachedText;
      if (!text) {
        const buffer = await downloadPDF(url);
        let data = await pdfParse(buffer);
        text = data.text;

        if (text.length < 500) {
          text = await extractTextWithOCR(buffer);
        }

        text = cleanExtractedText(text);
        await Deliverable.updateOne({ _id: deliverable._id }, { $set: { cachedText: text } });
      }

      texts.push({ text, url: deliverable.file.url });
    } catch (err) {
      console.error(`Error processing file ${deliverable.file.url}:`, err);
    }
  }

  return texts;
};

// Main route for summary and plagiarism check
router.post('/', async (req, res) => {
  const { fileUrl, includeSummary = false, includeAudio = false } = req.body;

  if (!fileUrl) {
    return res.status(400).json({ error: 'fileUrl is required' });
  }

  let pdfUrl = fileUrl;
  if (pdfUrl.includes('cloudinary.com')) {
    pdfUrl = pdfUrl.replace(/\?.*$/, '') + '?fl_attachment=true';
  }

  try {
    let text;
    const existingDeliverable = await Deliverable.findOne({ 'file.url': fileUrl });
    if (existingDeliverable && existingDeliverable.cachedText) {
      text = existingDeliverable.cachedText;
    } else {
      const buffer = await downloadPDF(pdfUrl);
      let data = await pdfParse(buffer);
      text = data.text;

      if (text.length < 500) {
        console.warn('PDF appears to be image-based. Using OCR.');
        text = await extractTextWithOCR(buffer);
      }

      text = cleanExtractedText(text);
      if (existingDeliverable) {
        await Deliverable.updateOne({ _id: existingDeliverable._id }, { $set: { cachedText: text } });
      }
    }

    const existingDocs = await getExistingTextsFromDatabase(fileUrl);
    const { overallScore, matches } = await calculatePlagiarismScore(text, existingDocs);

    const response = {
      plagiarismScore: overallScore,
      plagiarized: overallScore > 30,
      plagiarismDetails: matches,
    };

    if (includeSummary) {
      const summary = extractiveSummarization(text);
      response.summary = summary;
      response.wordCount = summary.split(/\s+/).length;

      if (includeAudio) {
        try {
          const audioUrl = await generateAudio(summary, null); // Auto-detect language
          response.audioUrl = audioUrl;
        } catch (err) {
          console.error('Failed to generate audio:', err.message);
          response.audioError = 'Could not generate audio for the summary.';
        }
      }
    }

    return res.json(response);
  } catch (err) {
    console.error('Error processing request:', err);
    res.status(500).json({ error: `Failed to process file: ${err.message}` });
  }
});

// Route to serve audio files
router.get('/audio/:filename', (req, res) => {
  const { filename } = req.params;
  const audioPath = path.join(__dirname, '../audio', filename);

  if (!fs.existsSync(audioPath)) {
    return res.status(404).json({ error: 'Audio file not found' });
  }

  res.set('Content-Type', 'audio/mpeg');
  const stream = fs.createReadStream(audioPath);
  stream.pipe(res);

  stream.on('end', () => {
    fs.unlink(audioPath, (err) => {
      if (err) console.error('Error deleting audio file:', err);
    });
  });
});

module.exports = router;