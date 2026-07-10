const { XMLSerializer } = require("@xmldom/xmldom");

async function saveDocx(zip, documentXml, outputPath) {
    const xml = new XMLSerializer().serializeToString(documentXml);

    zip.updateFile(
        "word/document.xml",
        Buffer.from(xml, "utf8")
    );

    zip.writeZip(outputPath);
}

module.exports = { saveDocx };