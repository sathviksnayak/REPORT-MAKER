require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");

const mammoth = require("mammoth");
const AdmZip = require("adm-zip");
const xml2js = require("xml2js");
const archiver = require("archiver");

const { replaceParagraphText } = require("./services/docxTextReplacer");
const { splitDocx } = require("./services/docxSplitter");
const { extractSections } = require("./services/htmlProcessor");
const { updateSections } = require("./services/updatesections");
const { extractStructure } = require("./services/xmlProcessor");
const { mergeStyles } = require("./services/styleMerger");

const app = express();

app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });

app.get("/", (req, res) => {
  res.send("Backend working");
});

app.post("/generate-report", upload.single("file"), async (req, res) => {
  let filePath;
  let staticPath;
  let contentPath;
  let zipPath;

  try {
    filePath = req.file.path;
    const topic = req.body.topic;

    const id = crypto.randomUUID();
    staticPath = path.join("uploads", `${id}-static.docx`);
    contentPath = path.join("uploads", `${id}-content.docx`);
    zipPath = path.join("uploads", `${id}.zip`);

    /*
    ==========================
    STEP 1: SPLIT DOCX
    ==========================
    */
    const { staticBuffer, contentBuffer } = await splitDocx(filePath, [
      "introduction",
      "objective",
    ]);

    fs.writeFileSync(staticPath, staticBuffer);
    fs.writeFileSync(contentPath, contentBuffer);

    /*
    ==========================
    STEP 2: CONTENT DOCX -> HTML -> AI REWRITE
    ==========================
    */

    const structure = await extractStructure(contentPath);

    const result = await mammoth.convertToHtml(
      { path: contentPath },
      {
        convertImage: mammoth.images.imgElement(function (image) {
          return image.read("base64").then(function (imageBuffer) {
            return {
              src: "data:" + image.contentType + ";base64," + imageBuffer,
              style: "max-width:100%; height:auto; display:block; margin:20px auto;",
            };
          });
        }),
      }
    );

    let html = result.value;

    // mergeStyles now injects data-index="N" onto each matched element
    html = mergeStyles(html, structure);

    // extractSections reads data-index directly — no structure arg needed
    const sections = extractSections(html);
    const unmatchedParagraphs = sections.flatMap((section) =>
      section.paragraphs.filter((paragraph) => paragraph.xmlIndex === -1)
    );

    if (unmatchedParagraphs.length > 0) {
      console.error(
        `Paragraph mapping failed for ${unmatchedParagraphs.length} paragraph(s). Sample:`,
        unmatchedParagraphs.slice(0, 10)
      );
      throw new Error("Paragraph mapping failed for one or more HTML paragraphs");
    }

    // updateSections preserves xmlIndex through the AI rewrite step
    const updated = await updateSections(sections, topic);

    /*
    ==========================
    STEP 3: REPLACE XML TEXT IN-PLACE (direct index, no slicing)
    ==========================
    */
    const zip = new AdmZip(contentPath);
    const documentEntry = zip.getEntry("word/document.xml");

    const parser = new xml2js.Parser({ explicitArray: true });
    const builder = new xml2js.Builder({ renderOpts: { pretty: false } });

    const parsed = await parser.parseStringPromise(
      documentEntry.getData().toString()
    );

    const paragraphs = parsed["w:document"]["w:body"][0]["w:p"];

    for (const section of updated) {
      if (!section.paragraphs) continue;
      
      for (const para of section.paragraphs) {
        // xmlIndex === -1 means extractSections couldn't match this
        // paragraph back to the original XML — skip rather than risk
        // writing to the wrong paragraph or crashing on undefined.
        if (para.xmlIndex === -1 || para.xmlIndex === undefined) continue;

        const targetParagraph = paragraphs[para.xmlIndex];
        if (!targetParagraph) {
          console.warn(`No XML paragraph at index ${para.xmlIndex}, skipping`);
          continue;
        }

        replaceParagraphText(targetParagraph, para.text);
      }
    }

    const newXml = builder.buildObject(parsed);
    zip.updateFile("word/document.xml", Buffer.from(newXml, "utf8"));
    const updatedContentBuffer = zip.toBuffer();


    console.log("Updated content buffer:", updatedContentBuffer.length);

// Debug only
fs.writeFileSync("debug-content.docx", updatedContentBuffer);
/*
==========================
STEP 4: CREATE ZIP
==========================
*/

console.log("Static DOCX size:", staticBuffer.length);
console.log("Updated DOCX size:", updatedContentBuffer.length);

// Uncomment this once to verify the generated DOCX itself.
// fs.writeFileSync("debug-content.docx", updatedContentBuffer);

const output = fs.createWriteStream(zipPath);
const archive = archiver("zip", {
  zlib: { level: 9 },
});

const archiveDone = new Promise((resolve, reject) => {
  output.on("close", resolve);
  output.on("error", reject);

  archive.on("error", reject);

  archive.on("warning", (err) => {
    if (err.code === "ENOENT") {
      console.warn(err);
    } else {
      reject(err);
    }
  });
});

archive.pipe(output);

archive.append(fs.readFileSync(staticPath), {
  name: "Report_Cover_and_Certificate.docx",
});

archive.append(updatedContentBuffer, {
  name: "Report_AI_Content.docx",
});

await archive.finalize();
await archiveDone;

console.log("ZIP size:", fs.statSync(zipPath).size);

// Verify the ZIP we just created
const verifyZip = new AdmZip(zipPath);

console.log(
  "ZIP entries:",
  verifyZip.getEntries().map((e) => ({
    name: e.entryName,
    size: e.header.size,
  }))
);

/*
==========================
STEP 5: SEND ZIP
==========================
*/

res.download(zipPath, `Report.zip`, (err) => {
  if (err) {
    console.error("Download error:", err);
  }

  try {
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }
  } catch (e) {
    console.error("Failed to delete zip:", e);
  }
});
  } catch (err) {
    console.error(err);

    if (!res.headersSent) {
      res.status(500).send("Error generating report");
    }
  } finally {
    const files = [filePath, staticPath, contentPath];

    files.forEach((file) => {
      if (file && fs.existsSync(file)) {
        try {
          fs.unlinkSync(file);
        } catch (err) {
          console.error("Cleanup failed:", err);
        }
      }
    });
  }
});



app.listen(5000, () => {
  console.log("Server running on port 5000");
});