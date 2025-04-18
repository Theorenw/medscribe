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
  // State for error
  const [error, setError] = useState('');
  // State for loading animation
  const [loading, setLoading] = useState(false);
  // States for showing JSON and summary
  const [showJSON, setShowJSON] = useState(true);
  const [jsonOutput, setJsonOutput] = useState('');
  const [summaryOutput, setSummaryOutput] = useState('');

  // State to determine is AI returned non medical note
  const [isMedicalOutput, setIsMedicalOutput] = useState(true);

  // Example note to show user
  const fillExampleNote = () => {
    setNote(`Pt c/o SOB & CP x2d. Hx of HTN, DM2. Lungs: ↓ breath sounds bilat, rales RLL. 
  BP 160/92, HR 102, T 37.8. SpO2 91% RA. ECG: NSR, no acute ST changes.
  
  Dx: CAP ?bacterial. 
  Tx: Start IV ceftriaxone 1g q24h + azithro 500mg x1 then 250mg PO qd x4d. 
  O2 via NC @2L/min. Monitor vitals q4h. CBC, BMP, CXR ordered. Reassess tmrw.
  
  Plan: Admit to ward. R/O sepsis. Notify ID if no improvement in 48h.`);
  };

  // Clears AI response output
  const clearOutput = () => {
    setJsonOutput('');
    setSummaryOutput('');
    setResult('');
    setIsMedicalOutput(true);
  };  

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Create new form data object
    const formData = new FormData();
    formData.append('note', note);
    if (file) formData.append('file', file);

    setLoading(true);
    try {
      // Send to backend
      const res = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/generate`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      
      // Returned result
      const responseText = res.data.message || res.data.output;

      if (responseText.includes("Input does not appear to be a medical or clinical note")) {
        setIsMedicalOutput(false);
        setResult(responseText);
        setJsonOutput('');
        setSummaryOutput('');
      } else {
        setIsMedicalOutput(true);

          // Json and summary returns
          const jsonMatch = responseText.match(/\[BEGIN_JSON\]([\s\S]*?)\[END_JSON\]/);
          const summaryMatch = responseText.match(/\[BEGIN_SUMMARY\]([\s\S]*?)\[END_SUMMARY\]/);
          
          if (jsonMatch && summaryMatch) {
            setJsonOutput(jsonMatch[1].trim());
            setSummaryOutput(summaryMatch[1].trim());
            setIsMedicalOutput(true);
          } else {
            setJsonOutput(responseText);
            setSummaryOutput('');
            setIsMedicalOutput(false);
          }
      }
      
      // Clear the input field after submission
      document.getElementById('note').value = '';
      document.getElementById('file').value = null;
      setNote('');
      setFile(null);
    } catch (err) {
      setResult('');
      setError('There was an error processing your note.');
    } finally {
      setLoading(false);
    }
  };

  // Html
  return (
    <>
      {/* Navbar */}
      <nav className="navbar navbar-expand-lg navbar-dark mb-4">
        <div className="container">
          <span className="navbar-brand mb-0 h1">MedScribe</span>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
            aria-controls="navbarNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav ms-3">
              <li className="nav-item">
                <a className="nav-link active" href="#faq">FAQ</a>
              </li>
              <li className="nav-item">
                <a className="nav-link active" href="#about">About</a>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      {/* Body */}
      <div className="page-container">
        <h1 className="header-title">MedScribe</h1>
        {/* Text area for note */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="note" className="header-section">Doctor's Note</label>
            <textarea
              id="note"
              className="form-control"
              rows="5"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Enter medical note here..."
            ></textarea>
            <button type="button" className="btn btn-outline-secondary btn-sm mt-2" onClick={fillExampleNote}>Use Example Note</button>
          </div>

          {/* File form input */}
          <div className="form-group">
            <label htmlFor="file" className="header-section">Upload a File</label>
            <input
              type="file"
              className="form-control"
              id="file"
              onChange={(e) => setFile(e.target.files[0])}
              accept=".txt"
            />
          </div>
          <div className="button-row">
            {/* Form submission buttom */}
            <button type="submit" className="btn btn-success">Submit</button>
            {/* Clear output buttom */}
            <button type="button" className="btn btn-outline-secondary" onClick={clearOutput}>Clear Output</button>
          </div>
        </form>

        {/* Output display after processing */}
        {(jsonOutput || summaryOutput) && isMedicalOutput && (
          <div className="output-card">
            <h5 className="section-label">Processed Output:</h5>
            {/* Json and summary switch */}
            {isMedicalOutput && showJSON ? (
              <pre>{jsonOutput}</pre>
            ) : (
              <div className="card p-3 bg-light">
                <p>{summaryOutput}</p>
              </div>
            )}

            {isMedicalOutput && (
              <div className="button-row">
                {/* Button to download json */}
                <button
                  className="btn btn-success"
                  onClick={() => {
                    const blob = new Blob([jsonOutput], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);

                    const link = document.createElement('a');
                    link.href = url;
                    link.download = 'medscribe_output.json';
                    link.click();
                  }}
                >
                  Download JSON
                </button>

                {/* Button to copy json */}
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(jsonOutput)
                      .then(() => alert('Copied to clipboard!'))
                      .catch(err => alert('Failed to copy JSON.'));
                  }}
                >
                  Copy to Clipboard
                </button>

                {/* Button to switch output */}
                <button
                  className="btn btn-success"
                  onClick={() => setShowJSON(!showJSON)}
                >
                  {showJSON ? 'Switch to Summary View' : 'Switch to JSON View'}
                </button>
              </div>
            )}
          </div>
        )}
        {!isMedicalOutput && (
          <div className="alert alert-warning mt-4">
            This does not appear to be a medical or clinical note. Please try again with a medical input.
          </div>
        )}
        {loading && (
          <div className="d-flex justify-content-center align-items-center mt-4">
            <div className="spinner-border medical-color" role="status">
              <span className="visually-hidden">Processing...</span>
            </div>
          </div>
        )}
        {error && (
          <div className="alert alert-danger mt-3" role="alert">
            {error}
          </div>
        )}
        {/* About section */}
        <section id="about" className="mt-5">
          <h4 className="section-label-big">About MedScribe</h4>
          <p>
            MedScribe is a health-focused AI tool designed to translate raw medical notes into structured, standardized data, aligning with
            Ontario healthcare documentation standards.
          </p>
          <p>
            Built with OpenAI's highly trained GPT-4 AI model and fine-tuned on clinical accuracy, MedScribe helps reduce the manual workload of
            translating notes into a structured output, just with one click.
          </p>
          <p>
            This tool is best used in healthcare environments where speed, accuracy and efficiency are key,
             to quickly structure and standardized raw notes into database-ready json. 
          </p>
        </section>

        {/* Process section */}
        <section id="process" className="mt-5 text-center output-card">
          <h4 className="header-section mb-4">The MedScribe Pipeline</h4>

          <div className="row justify-content-center align-items-center g-4">
            <div className="col-md-3">
              <div className="p-3 border rounded bg-light">
                <h5>Raw Notes</h5>
                <p className="small text-muted">Unstructured medical or clinical text</p>
              </div>
            </div>

            <div className="col-md-1 d-none d-md-block">
              <span style={{ fontSize: '2rem' }}>➡️</span>
            </div>

            <div className="col-md-3">
              <div className="p-3 border rounded bg-white shadow-sm">
                <h5>MedScribe</h5>
                <p className="small text-muted">Processes and validates content using NLP AI models</p>
              </div>
            </div>

            <div className="col-md-1 d-none d-md-block">
              <span style={{ fontSize: '2rem' }}>➡️</span>
            </div>

            <div className="col-md-3">
              <div className="p-3 border rounded bg-light">
                <h5>Structured Output</h5>
                <p className="small text-muted">Formatted JSON following ICD-10-CA / HL7</p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ section */}
        <section id="faq" className="mt-5">
          <h4 className="mb-4 section-label-big">Frequently Asked Questions</h4>
          <div className="accordion custom-accordion" id="faqAccordion">
            <div className="accordion-item shadow-sm">
              <h2 className="accordion-header" id="q1">
                <button className="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#a1">
                  What file types are supported?
                </button>
              </h2>
              <div id="a1" className="accordion-collapse collapse">
                <div className="accordion-body">
                  Only plain text (.txt) files are supported for uploading.
                </div>
              </div>
            </div>

            <div className="accordion-item shadow-sm">
              <h2 className="accordion-header" id="q2">
                <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#a2">
                  Is my data saved?
                </button>
              </h2>
              <div id="a2" className="accordion-collapse collapse">
                <div className="accordion-body">
                  No data is stored. Notes are processed in-memory and cleared after submission.
                </div>
              </div>
            </div>

            <div className="accordion-item shadow-sm">
              <h2 className="accordion-header" id="q3">
                <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#a3">
                  Is this tool medically certified?
                </button>
              </h2>
              <div id="a3" className="accordion-collapse collapse">
                <div className="accordion-body">
                  MedScribe is natural language processing AI tool and can make mistakes. Always double check the output for mistakes. 
                </div>
              </div>
            </div>

            <div className="accordion-item shadow-sm">
              <h2 className="accordion-header" id="q4">
                <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#a4">
                  What guidelines does this follow?
                </button>
              </h2>
              <div id="a4" className="accordion-collapse collapse">
                <div className="accordion-body">
                  MedScribe follows documentation and coding standards aligned with Ontario’s healthcare system, including the <strong>ICD-10-CA 
                  (International Classification of Diseases, Canada)</strong> and <strong>HL7 (Health Level Seven)</strong> formatting practices.
                </div>
              </div>
            </div>

            <div className="accordion-item shadow-sm">
              <h2 className="accordion-header" id="q5">
                <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#a5">
                  What purpose does this serve?
                </button>
              </h2>
              <div id="a5" className="accordion-collapse collapse">
                <div className="accordion-body">
                  MedScribe streamlines clinical documentation by converting raw medical notes into database ready structured formats, helping improve 
                  data accuracy, reduce manual workload, and greatly improve administrative processing times.
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
      
      {/* Footer */}
      <footer className="footer">
      <p>Made by Theoren & Khanh</p>
    </footer>
    </>
  );
}

export default App;
