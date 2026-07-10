
const path = require("path");
require("dotenv").config();

const { parseDocx } = require("./services/parseDocx");
const { findSections } = require("./services/findSections");
const { rewriteSections } = require("./services/rewriteSections");
const { saveDocx } = require("./services/saveDocx");


const express = require("express");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const fs = require("fs");

const app = express();

const cors = require("cors");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post("/generate-report", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send("No DOCX file uploaded.");
        }

        const topic = req.body.topic;
        const hasCoverPage = req.body.hasCoverPage === "true";

        const inputPath = req.file.path;
        const outputPath = path.join(__dirname, "generated.docx");

        const {
            zip,
            documentXml,
            paragraphs
        } = await parseDocx(inputPath);

        const sections = findSections(
            paragraphs,
            hasCoverPage
        );

        await rewriteSections(
            sections,
            topic
        );

        await saveDocx(
            zip,
            documentXml,
            outputPath
        );

        res.download(outputPath, "generated_report.docx", () => {
            // Cleanup temporary files
            fs.unlink(inputPath, () => {});
            fs.unlink(outputPath, () => {});
        });

    } catch (err) {
    console.error(err);

    if (req.file) {
        fs.unlink(req.file.path, () => {});
    }

    res.status(500).send("Failed to generate report.");
}
});


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});