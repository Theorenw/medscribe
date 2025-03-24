const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');
const { Configuration, OpenAIApi } = require('openai');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Load API key
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// File upload setup
const upload = multer({ dest: 'uploads/' });

app.post('/api/generate', upload.single('file'), async (req, res) => {
  let extractedText = '';
  const noteText = req.body.note || '';

  try {
    if (req.file) {
      const filePath = path.join(__dirname, req.file.path);

      // If uploaded file is PDF
      if (req.file.mimetype === 'application/pdf') {
        const dataBuffer = fs.readFileSync(filePath);
        const parsed = await pdfParse(dataBuffer);
        extractedText = parsed.text;
      }
      // If uploaded file is TXT
      else if (req.file.mimetype === 'text/plain') {
        extractedText = fs.readFileSync(filePath, 'utf8');
      } else {
        return res.status(400).json({ error: 'Unsupported file type' });
      }

      // Delete the uploaded file afterward
      fs.unlinkSync(filePath);
    }

    const finalNote = extractedText || noteText;

    if (!finalNote) {
      return res.status(400).json({ error: 'No note or file provided' });
    }

    // Prompt for GPT model
    const prompt = `
You will be given a raw clinical note. 
Your task is to:
1. Output a JSON object following ICD-10-CA/HL7 style standards.
2. Also provide a short natural-language summary of the note (1-2 paragraphs).
Separate the two clearly with these markers:
[BEGIN_JSON]
...JSON output...
[END_JSON]

[BEGIN_SUMMARY]
...natural summary...
[END_SUMMARY]

Note: If the input does **NOT** contain medical terminology, patient symptoms, diagnoses, treatment plans, 
medications, or other clinical language, return: "Error: Input does not appear to be a medical or clinical note."
Important: Do not wrap the json output in code blocks or backticks. Return only raw JSON and NO non-whitespace characters.
Here is the note:
${finalNote}
`;

    const completion = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo', // Using gpt-4 final, gpt-3.5-turbo for testing
      messages: [
        { role: 'system', content: 'You are a helpful medical coding assistant.' },
        { role: 'user', content: prompt },
      ],
    });

    const output = completion.data.choices[0].message.content;
    res.json({ output });

  } catch (err) {
    console.error('Error with GPT API:', err);
    res.status(500).json({ error: 'Something went wrong when processing the note.' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
