const path = require("path");
require("dotenv").config();

const { parseDocx } = require("./services/parseDocx");
const { findSections } = require("./services/findSections");
const { rewriteSections } = require("./services/rewriteSections");
const { saveDocx } = require("./services/saveDocx");

async function main() {
    try {
        const {
            zip,
            documentXml,
            paragraphs
        } = await parseDocx(
            path.join(__dirname, "sample.docx")
        );

        const sections = findSections(paragraphs, true);

        console.log(`Sections found: ${sections.length}`);

        const topic = "Blockchain";

        console.log(`\nTopic: ${topic}\n`);

        await rewriteSections(
            sections,
            topic
        );

        await saveDocx(
            zip,
            documentXml,
            path.join(__dirname, "output.docx")
        );

        console.log("\n✅ output.docx saved successfully.");

    } catch (err) {
        console.error(err);
    }
}

main();