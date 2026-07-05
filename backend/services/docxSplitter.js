const AdmZip = require("adm-zip");
const xml2js = require("xml2js");

function getRunText(r) {
  const t = r["w:t"]?.[0];
  if (t === undefined) return "";
  return typeof t === "string" ? t : (t._ || "");
}

function getParagraphText(p) {
  return (p["w:r"] || [])
    .map(getRunText)
    .join("");        
}

function findSplitParagraphIndex(
  paragraphs,
  headingCandidates = ["introduction", "objective"]
) {
  const regexes = headingCandidates.map(
    h => new RegExp(`^(\\d+\\.?\\d*\\s*)?${h}`, "i")
  );

  for (let i = 0; i < paragraphs.length; i++) {
    const text = getParagraphText(paragraphs[i]).trim();

    if (!text) continue;

    for (const regex of regexes) {
      if (regex.test(text)) {
        return i;
      }
    }
  }

  return -1;
}

async function splitDocx(
  filePath,
  headingCandidates = ["introduction", "objective"]
) {
  const zip = new AdmZip(filePath);

  const documentEntry = zip.getEntry("word/document.xml");

  if (!documentEntry) {
    throw new Error("Invalid docx");
  }

  const xml = documentEntry.getData().toString();

  const parser = new xml2js.Parser({
    explicitArray: true
  });

  const builder = new xml2js.Builder({
    renderOpts: {
      pretty: false
    }
  });

  const parsed = await parser.parseStringPromise(xml);

  const body = parsed["w:document"]["w:body"][0];

  const paragraphs = body["w:p"] || [];

  const splitIndex = findSplitParagraphIndex(
    paragraphs,
    headingCandidates
  );

  if (splitIndex === -1) {
    throw new Error("Split heading not found");
  }

  const sectPr = body["w:sectPr"];

let breakCount = 0;

for (let p of paragraphs) {
  const xml = JSON.stringify(p);

  if (xml.includes("lastRenderedPageBreak")) {
    breakCount++;
  }
}

console.log("Page break markers:", breakCount);




  const staticParagraphs = paragraphs.slice(0, splitIndex);
  const contentParagraphs = paragraphs.slice(splitIndex);

  console.log("Total paragraphs:", paragraphs.length);
  console.log("Split index:", splitIndex);
  console.log("Static count:", staticParagraphs.length);
  console.log("Content count:", contentParagraphs.length);

  let staticBreaks = 0;

for (let p of staticParagraphs) {
  const xml = JSON.stringify(p);

  if (xml.includes("lastRenderedPageBreak")) {
    staticBreaks++;
  }
}

console.log("Static page breaks:", staticBreaks);

  function buildDocxBuffer(paragraphSlice) {
    const newParsed = JSON.parse(
      JSON.stringify(parsed)
    );

    const newBody =
      newParsed["w:document"]["w:body"][0];

    newBody["w:p"] = paragraphSlice;

    if (sectPr) {
      newBody["w:sectPr"] = sectPr;
    }

    const newXml = builder.buildObject(newParsed);

    const newZip = new AdmZip();

    zip.getEntries().forEach((entry) => {
      if (entry.entryName === "word/document.xml")
        return;

      newZip.addFile(
        entry.entryName,
        entry.getData()
      );
    });

    newZip.addFile(
      "word/document.xml",
      Buffer.from(newXml, "utf8")
    );

    return newZip.toBuffer();
  }

  const staticBuffer =
    buildDocxBuffer(staticParagraphs);

  const contentBuffer =
    buildDocxBuffer(contentParagraphs);

  return {
    staticBuffer,
    contentBuffer,
    splitIndex
  };
}

module.exports = {
  splitDocx,
  findSplitParagraphIndex,
  getParagraphText
};