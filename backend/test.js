const path = require("path");
require("dotenv").config();

const { parseDocx } = require("./services/parseDocx");
const { findSections } = require("./services/findSections");
const { rewriteSections } = require("./services/rewriteSections");
function getRunText(r) {
    const t = r["w:t"]?.[0];
    if (t === undefined) return "";
    return typeof t === "string" ? t : (t._ || "");
}

function getParagraphText(p) {
    return (p["w:r"] || []).map(getRunText).join("");
}
const topics = [
    "Space Exploration",
    "Artificial Intelligence in Healthcare",
    "Renewable Energy",
    "Wildlife Conservation",
    "Climate Change",
    "History of Chess",
    "Ancient Roman Architecture",
    "Quantum Computing",
    "Electric Vehicles",
    "Ocean Pollution",
    "Cyber Security",
    "Coffee Cultivation",
    "Mars Colonization",
    "Blockchain in Supply Chains",
    "History of the Internet"
];

async function main() {
    const { paragraphs } = await parseDocx(
        path.join(__dirname, "sample.docx")
    );

    const sections = findSections(paragraphs, true);

    console.log(`Sections found: ${sections.length}`);

    const randomTopic =
        topics[Math.floor(Math.random() * topics.length)];

    console.log(`\nRandom Topic: ${randomTopic}`);

    console.log("\nBefore rewrite:\n");
    console.log(sections[0].content[0].originalText);

   const firstSection = sections[0];

console.log("\n===== BEFORE =====\n");
firstSection.content
    .filter(x => x.type === "paragraph")
    .forEach((p, i) => {
        console.log(`Paragraph ${i + 1}`);
        console.log(p.originalText);
        console.log();
    });

await rewriteSections(sections, randomTopic);

console.log("\n===== AFTER =====\n");
firstSection.content
    .filter(x => x.type === "paragraph")
    .forEach((p, i) => {
        console.log(`Paragraph ${i + 1}`);
        console.log(getParagraphText(p.node));
        console.log();
    });


}

main().catch(console.error);