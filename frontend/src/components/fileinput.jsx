
import './fileinput.css';
import { useState } from "react";

export default function FileInput({ onFileChange }) {
  return (
    <div>
      <label>Upload DOCX:</label>
      <input
        type="file"
        accept=".docx"
        onChange={(e) => onFileChange(e.target.files[0])}
      />
    </div>
  );
}