const path = require("path");
const AdmZip = require("adm-zip");
const xml2js = require("xml2js");
require("dotenv").config();

const { parseDocx } = require("./services/parseDocx");
const { findSections } = require("./services/findSections");
const { rewriteSections } = require("./services/rewriteSections");

async function main() {
    const filePath = path.join(__dirname, "sample.docx");

    const { zip, parsed, paragraphs } = await parseDocx(filePath);

    const sections = findSections(paragraphs);

    console.log("Sections found:", sections.length);

    await rewriteSections(
        sections,
        "Facilitating Digitized Money Transactions"
    );

    const builder = new xml2js.Builder();

    const newXml = builder.buildObject(parsed);

    zip.updateFile(
        "word/document.xml",
        Buffer.from(newXml, "utf8")
    );

    zip.writeZip(path.join(__dirname, "output.docx"));

    console.log("output.docx created");
}

main().catch(console.error);