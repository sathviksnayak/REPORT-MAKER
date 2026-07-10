import UploadForm from "../components/uploadform";
import './homepage.css'

export default function HomePage() {
  return (
    <div className="container">
      <h1>Report Generator</h1>
      <p style={{ textAlign: "center", color: "#666", marginBottom: "20px" }}>
  Generate structured academic reports from templates
</p>
      <UploadForm />
    </div>
  );
}