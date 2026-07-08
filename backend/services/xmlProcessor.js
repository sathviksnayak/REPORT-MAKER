const AdmZip = require("adm-zip");
const xml2js = require("xml2js");

function getRunText(run) {
  const t = run["w:t"]?.[0];

  if (t === undefined) return "";

  if (typeof t === "string") return t;

  return t._ || "";
}

async function extractStructure(filePath) {
  const zip = new AdmZip(filePath);

  const entry = zip.getEntry("word/document.xml");
  if (!entry) {
    throw new Error("word/document.xml not found");
  }

  const xml = entry.getData().toString("utf8");

  const parser = new xml2js.Parser({
    explicitArray: true,
  });

  const parsed = await parser.parseStringPromise(xml);

  const body = parsed?.["w:document"]?.["w:body"]?.[0];

  if (!body) {
    throw new Error("Invalid document.xml");
  }

  const paragraphs = body["w:p"] || [];

  return paragraphs.map((p, index) => {
    const runs = p["w:r"] || [];
    const pPr = p["w:pPr"]?.[0] || {};

    const text = runs.map(getRunText).join("");

    const hasPageBreak = runs.some((run) =>
      (run["w:br"] || []).some(
        (br) => br.$?.["w:type"] === "page"
      )
    );

    return {
      index,
      text,
      xml: p,

      style: pPr["w:pStyle"]?.[0]?.$?.["w:val"] || "Normal",
      align: pPr["w:jc"]?.[0]?.$?.["w:val"] || "left",
      spacing: pPr["w:spacing"]?.[0]?.$ || {},
      indent: pPr["w:ind"]?.[0]?.$ || {},

      pageBreak: hasPageBreak,
    };
  });
}

module.exports = {
  extractStructure,
};