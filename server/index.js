const express = require('express');
const cors = require('cors');
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

// GPT processing endpoint
app.post('/api/generate', async (req, res) => {
  const userNote = req.body.note;

  if (!userNote) {
    return res.status(400).json({ error: 'No note provided' });
  }

  try {
    // Prompt for GPT model
    const prompt = `
You are a medical documentation assistant trained in health informatics. Your job is to take raw, unstructured doctor 
or nurse notes and convert them into clearly formatted, database-ready records. Structure the output in a standardized 
JSON format that includes relevant fields like patient information, diagnosis, ICD-10-CA codes, medications, vitals, and 
treatment plan. The output must be HL7-compliant in style and format. Expand shorthand, clarify abbreviations, and ensure 
clinical accuracy while preserving the original intent of the note.

Note: "${userNote}"

Respond English, no extra commentary.
`;

    const completion = await openai.createChatCompletion({
      model: 'gpt-4', // Using GPT-4
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
