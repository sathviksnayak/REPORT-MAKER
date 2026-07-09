const xml2js = require("xml2js");

async function saveDocx(zip, documentXml, outputPath) {
    // Convert JS object back to XML
    const builder = new xml2js.Builder({
        headless: true
    });

    const updatedXml = builder.buildObject(documentXml);

    // Replace word/document.xml
    zip.updateFile(
        "word/document.xml",
        Buffer.from(updatedXml, "utf8")
    );

    // Write new docx
    zip.writeZip(outputPath);
}

module.exports = { saveDocx };