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
You are a clinical documentation assistant trained to process medical notes into structured data using ICD-10-CA, HL7, and CCI coding standards used in Ontario, Canada.

Your task is to:
1. Extract relevant data from the note into a JSON object using the structure defined below.
2. Also generate a short natural-language summary of the note (1–2 paragraphs) for human readability.

The JSON must include:
- Clinical complaints, past medical history
- Physical exam findings, vitals, ECG if available
- Diagnosis with ICD-10-CA codes
- Treatment details (medications, oxygen therapy, tests ordered)
- Optional: CCI codes if applicable (e.g., imaging, interventions)
- Plan and follow-up instructions

Only include fields if mentioned or inferable with high certainty. **Do not fabricate any values.**  
If any section is missing from the note, **omit the field entirely.**

Strict output format:

[BEGIN_JSON]
{ JSON structured output here — raw, no backticks, no extra text }
[END_JSON]

[BEGIN_SUMMARY]
Natural-language summary of the note (1–2 paragraphs, clear and clinical).
[END_SUMMARY]

If the note does not clearly contain medical terminology, symptoms, medications, diagnoses, or clinical plans, return:
"Error: Input does not appear to be a medical or clinical note."

Important:
- Do not wrap the JSON in code blocks, triple backticks or markdown.
- Do not guess values or hallucinate information.
- Follow the field structure and naming conventions consistently across outputs.
- Return the JSON and summary as plain text only, using only the [BEGIN_JSON] and [END_JSON] / [BEGIN_SUMMARY] and [END_SUMMARY] markers.

Here is the note (shorthand may be used such as 'SOB' for shortness of breath, 'CP' for chest pain, etc.):
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
