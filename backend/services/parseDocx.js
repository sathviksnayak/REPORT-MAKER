const AdmZip = require("adm-zip");
const { DOMParser } = require("@xmldom/xmldom");

async function parseDocx(filePath) {
    const zip = new AdmZip(filePath);

    const documentEntry = zip.getEntry("word/document.xml");
    if (!documentEntry) {
        throw new Error("Invalid docx: word/document.xml not found");
    }

    const xml = documentEntry.getData().toString("utf8");

    const documentXml = new DOMParser().parseFromString(
        xml,
        "application/xml"
    );

    // Every Word paragraph (<w:p>)
    const paragraphs = Array.from(
        documentXml.getElementsByTagName("w:p")
    );

    return {
        zip,
        documentXml,
        paragraphs
    };
}

module.exports = { parseDocx };