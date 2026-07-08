const AdmZip = require("adm-zip");
const xml2js = require("xml2js");

/**
 * Loads a .docx file and parses word/document.xml into a JS object tree.
 * Returns both the full parsed tree (needed later to rebuild the file)
 * and the raw <w:p> paragraph array (needed to find/edit sections).
 *
 * Everything downstream holds direct references into `paragraphs` —
 * no indices are used anywhere in this pipeline.
 */
async function parseDocx(filePath) {
  const zip = new AdmZip(filePath);

  const documentEntry = zip.getEntry("word/document.xml");
  if (!documentEntry) {
    throw new Error("Invalid docx: word/document.xml not found");
  }

  const parser = new xml2js.Parser();
  const parsed = await parser.parseStringPromise(documentEntry.getData().toString());

  const body = parsed["w:document"]["w:body"][0];
  const paragraphs = body["w:p"] || [];

  return { zip, parsed, paragraphs };
}

module.exports = { parseDocx };