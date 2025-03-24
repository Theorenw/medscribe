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
You are a clinical documentation assistant trained to process raw medical notes into structured clinical data.

Your task is to:
1. Output a JSON object following the schema provided below. Use ICD-10-CA codes for diagnoses and CCI codes for procedures where applicable.
2. Provide a short natural-language summary (1–2 paragraphs) of the note.

Only include fields that are clearly present in the input. If a value is not mentioned, omit it from the JSON — do not guess.

If the note is not clinical or medical (e.g., homework, casual writing), return exactly:
"Error: Input does not appear to be a medical or clinical note."

Your output format must follow this structure:

[BEGIN_JSON]
{ raw JSON goes here }
[END_JSON]

[BEGIN_SUMMARY]
Natural-language summary here.
[END_SUMMARY]

Note:
- Do not wrap the JSON in code blocks or markdown.
- Follow snake_case for all keys.
- Be consistent and concise.

Schema example to follow:

{
  "patient": {
    "complaints": ["..."],
    "history": ["..."]
  },
  "physical_exam": {
    "findings": {
      "lungs": "...",
      "heart": "...",
      "other": "..."
    },
    "vitals": {
      "blood_pressure": "...",
      "heart_rate": "...",
      "temperature": "...",
      "oxygen_saturation": "...",
      "oxygen_delivery": "..." 
    },
    "ecg_findings": "..."
  },
  "diagnosis": {
    "description": "...",
    "ICD_10_CA": ["..."]
  },
  "treatment": {
    "medications": [
      {
        "drug": "...",
        "dose": "...",
        "route": "...",
        "frequency": "..."
      }
    ],
    "oxygen_therapy": "...",
    "monitoring": "...",
    "tests_ordered": ["..."]
  },
  "plan": {
    "admission_status": "...",
    "follow_up": "...",
    "specialist_notification": "..."
  }
}

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
