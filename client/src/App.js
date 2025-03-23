import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  // State for text area
  const [note, setNote] = useState('');
  // State for uploaded file
  const [file, setFile] = useState(null);
  // State for GPT response
  const [result, setResult] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Create new form data object
    const formData = new FormData();
    formData.append('note', note);
    if (file) formData.append('file', file);

    try {
      // Send to backend
      const res = await axios.post('/api/generate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      // Returned result
      setResult(res.data.message || res.data.output);

      // Clear the input field after submission
      document.getElementById('note').value = '';
      document.getElementById('file').value = null;
      setNote('');
      setFile(null);
    } catch (err) {
      setResult('Error processing note.');
    }
  };

  // Html
  return (
    <div className="container mt-5">
      <h1 className="text-center mb-4">MedScribe</h1>
      {/* Text area for note */}
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label htmlFor="note" className="form-label">Doctor's Note</label>
          <textarea
            id="note"
            className="form-control"
            rows="5"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Enter medical note here..."
          ></textarea>
        </div>

        {/* File form input */}
        <div className="mb-3">
          <label htmlFor="file" className="form-label">Or Upload a File</label>
          <input
            type="file"
            className="form-control"
            id="file"
            onChange={(e) => setFile(e.target.files[0])}
            accept=".txt,.pdf"
          />
        </div>
        <div className="d-flex gap-2">
          {/* Form submission buttom */}
          <button type="submit" className="btn btn-primary">Submit</button>
          {/* Clear output buttom */}
          <button type="button" className="btn btn-secondary" onClick={() => setResult('')}>Clear Output</button>
        </div>
      </form>

      {/* Output display after processing */}
      {result && (
        <div className="mt-4">
          <h5>Processed Output:</h5>
          <pre>{result}</pre>

          <div className="d-flex gap-2 mt-2">
            {/* Button to download json */}
            <button
              className="btn btn-success"
              onClick={() => {
                const cleanResult = result
                  .replace(/```json\n?/, '') // Remove starting ```json
                  .replace(/```$/, '');      // Remove ending ```
                const blob = new Blob(
                  [JSON.stringify(JSON.parse(cleanResult), null, 2)],
                  { type: 'application/json' }
                );
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'medscribe_output.json';
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Download JSON
            </button>

            {/* Button to copy json */}
            <button
              className="btn btn-outline-secondary"
              onClick={() => {
                const cleanResult = result
                  .replace(/```json\n?/, '') // Remove starting ```json
                  .replace(/```$/, '');      // Remove ending ```
                navigator.clipboard.writeText(
                  JSON.stringify(JSON.parse(cleanResult), null, 2)
                );
                alert('JSON copied to clipboard');
              }}
            >
              Copy to Clipboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
