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
            parsed,
            paragraphs
        } = await parseDocx(
            path.join(__dirname, "sample.docx")
        );

        // const sections = findSections(paragraphs);

        // console.log(`Sections found: ${sections.length}`);

        // await rewriteSections(
        //     sections,
        //     "blockchain"
        // );

        await saveDocx(
            zip,
            parsed,
            path.join(__dirname, "output.docx")
        );

        console.log("✅ Saved output.docx");
    } catch (err) {
        console.error(err);
    }
}

main();