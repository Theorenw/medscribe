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
Before generating output, first determine if the provided input is clinical or medical in nature.

If the input does **NOT** contain medical terminology, patient symptoms, diagnoses, treatment plans, medications, or other clinical language — respond with:

Error: Input does not appear to be a medical or clinical note.

  Otherwise, proceed to generate the structured medical JSON output using the format below.
    
You are a medical documentation assistant trained in health informatics. Your job is to take raw, unstructured doctor 
or nurse notes and convert them into clearly formatted, database-ready records. Structure the output in a standardized 
JSON format that includes relevant fields like patient information, diagnosis, ICD-10-CA codes, medications, vitals, and 
treatment plan. The output must be HL7-compliant in style and format. Expand shorthand, clarify abbreviations, and ensure 
clinical accuracy while preserving the original intent of the note.

Note: "${finalNote}"

Respond English, no extra commentary.
Important: Do not wrap the output in code blocks or backticks. Return only raw JSON and NO non-whitespace characters.
`;

    const completion = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo', // Using gpt-4 final, gpt-3.5-turbo for testing
      messages: [
        { role: 'system', content: 'You are a helpful medical coding assistant.' },
        { role: 'user', content: prompt },
      ],
    });

    const output = completion.data.choices[0].message.content;
    console.log("GPT response", output);
    res.json({ message: response.data.choices[0].message.content });

  } catch (err) {
    console.error('Error with GPT API:', err);
    res.status(500).json({ error: 'Something went wrong on the server.' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
