const axios = require('axios');
const pdfParse = require('pdf-parse');

async function extractTextFromPDF(pdfUrl) {
  const response = await axios.get(pdfUrl, { responseType: 'arraybuffer' });
  const buffer = Buffer.from(response.data, 'binary');
  const data = await pdfParse(buffer);
  return data.text;
}

module.exports = extractTextFromPDF;
