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
const match = html.match(/data-index="\d+"/g);
console.log(match?.slice(0, 20));
    // extractSections reads data-index directly — no structure arg needed
    const sections = extractSections(html);
    console.log(
  JSON.stringify(sections[0], null, 2)
);
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

    /*
    ==========================
    STEP 4: CREATE ZIP ON DISK (verify before streaming to client)
    ==========================
    */
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.on("warning", console.warn);
    archive.on("error", (err) => {
      throw err;
    });

    archive.pipe(output);

    archive.append(fs.readFileSync(staticPath), {
      name: "Report_Cover_and_Certificate.docx",
    });
    archive.append(updatedContentBuffer, {
      name: "Report_AI_Content.docx",
    });

    await archive.finalize();

    await new Promise((resolve, reject) => {
      output.on("close", resolve);
      output.on("error", reject);
    });

    console.log("ZIP created. Size:", fs.statSync(zipPath).size);

    /*
    ==========================
    STEP 5: SEND ZIP
    ==========================
    */
    res.download(zipPath, "Report.zip", (err) => {
      if (err) console.error("Download error:", err);
      if (fs.existsSync(zipPath)) {
        fs.unlinkSync(zipPath);
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