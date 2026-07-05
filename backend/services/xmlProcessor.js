const AdmZip = require("adm-zip");
const xml2js = require("xml2js");

function getRunText(r) {
  const t = r["w:t"]?.[0];
  if (t === undefined) return "";
  return typeof t === "string" ? t : (t._ || "");
}

async function extractStructure(filePath) {
  const zip = new AdmZip(filePath);
  const xml = zip.getEntry("word/document.xml").getData().toString();

  const parsed = await new xml2js.Parser().parseStringPromise(xml);
  const paragraphs = parsed["w:document"]["w:body"][0]["w:p"] || [];

return paragraphs.map((p, index) => {
  const pPr = p["w:pPr"]?.[0] || {};

  const hasPageBreak = (p["w:r"] || []).some(r =>
    (r["w:br"] || []).some(
      br => br.$?.["w:type"] === "page"
    )
  );

  const text = (p["w:r"] || [])
    .map(getRunText)
    .join("");

  return {
    index,
    xml: p,          
    text,
    style: pPr["w:pStyle"]?.[0]?.$?.["w:val"] || "Normal",
    align: pPr["w:jc"]?.[0]?.$?.["w:val"] || "left",
    spacing: pPr["w:spacing"]?.[0]?.$ || {},
    indent: pPr["w:ind"]?.[0]?.$ || {},
    pageBreak: hasPageBreak
  };
});
}

module.exports = { extractStructure };