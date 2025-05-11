// plagiarismCheck.js
const axios = require('axios');
require('dotenv').config();

const HUGGING_FACE_API_TOKEN = process.env.HUGGING_FACE_API_KEY;

const headers = {
  Authorization: `Bearer ${HUGGING_FACE_API_TOKEN}`,
};

const checkPlagiarism = async (text1, text2) => {
  try {
    const response = await axios.post(
      'https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2',
      {
        inputs: {
          source_sentence: text1,
          sentences: [text2],
        },
      },
      { headers }
    );

    const score = response.data[0].score;
    return score;
  } catch (err) {
    console.error("Error from Hugging Face API", err.response?.data || err.message);
    return null;
  }
};

module.exports = checkPlagiarism;
