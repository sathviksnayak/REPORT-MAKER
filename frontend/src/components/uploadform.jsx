import { useState } from "react";
import FileInput from "./fileinput";
import TopicInput from "./topicinput";

import "./uploadform.css";

export default function UploadForm() {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [topic, setTopic] = useState("");

  // NEW
  const [hasCoverPage, setHasCoverPage] = useState(false);
const [docUrl, setDocUrl] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      alert("Please upload a file");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("topic", topic);

    // NEW
    formData.append("hasCoverPage", hasCoverPage);

    try {
      setLoading(true);

      const res = await fetch("http://localhost:5000/generate-report", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errText = await res.text();
        alert(`Failed to generate report: ${errText}`);
        return;
      }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);

    setDocUrl(url);
    } catch (err) {
      console.error(err);
      alert("Something went wrong while generating the report.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <p>Generating report...</p>
      </div>
    );
  }

  return (
    <div>
      <form className="form" onSubmit={handleSubmit}>
        <FileInput onFileChange={setFile} />

        <TopicInput topic={topic} setTopic={setTopic} />

        {/* NEW */}
        <label className="checkbox-container">
          <input
            type="checkbox"
            checked={hasCoverPage}
            onChange={(e) => setHasCoverPage(e.target.checked)}
          />
          Report contains a cover/certificate page
        </label>

        <button className="button" type="submit">
          Generate Report
        </button>
      </form>

{docUrl && (
  <a href={docUrl} download="generated_report.docx">
    <button className="button download-btn">
      Download Report
    </button>
  </a>
)}
    </div>
  );
}