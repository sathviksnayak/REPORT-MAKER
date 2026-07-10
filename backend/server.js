const formatter = require("xml-formatter");
const fs = require("fs");
const originalXml = fs.readFileSync("document.xml", "utf8");
const pretty = formatter(originalXml);

fs.writeFileSync("uploads/document2_pretty.xml", pretty);