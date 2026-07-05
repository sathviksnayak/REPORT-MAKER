const cheerio = require("cheerio");

function mergeStyles(html, structure) {
  const $ = cheerio.load(html);

  const elements = $("p, h1, h2, h3").toArray();

  // Cursor prevents matching the same XML paragraph twice when multiple
  // HTML elements have identical/near-identical text (e.g. repeated
  // boilerplate, multiple empty paragraphs).
  let structureCursor = 0;

  function findStructureMatch(text) {
    const needle = text.trim().substring(0, 15);
    if (!needle) return { xml: null, index: -1 };

    for (let i = structureCursor; i < structure.length; i++) {
      const candidate = structure[i];
      if (candidate.text && candidate.text.includes(needle)) {
        structureCursor = i + 1;
        return { xml: candidate, index: i };
      }
    }
    return { xml: null, index: -1 };
  }

  elements.forEach((el) => {
    let $el = $(el);
    let text = $el.text().trim();

    const { xml, index } = findStructureMatch(text);

    if (!xml) return;

    // Tag every matched element with its originating XML paragraph index,
    // so extractSections can read it directly instead of re-matching text.
    $el.attr("data-index", index);

    // -------------------
    // 🧠 HEADING FIX (must run first — replaceWith discards attrs set later)
    // -------------------
    if (xml.style === "Heading1" && el.name !== "h1") {
      const styleAttr = $el.attr("style");
      const dataIndex = $el.attr("data-index");
      const newEl = $(`<h1>${$el.html()}</h1>`);
      if (styleAttr) newEl.attr("style", styleAttr);
      if (dataIndex !== undefined) newEl.attr("data-index", dataIndex);
      $el.replaceWith(newEl);
      $el = newEl;
    } else if (xml.style === "Heading2" && el.name !== "h2") {
      const styleAttr = $el.attr("style");
      const dataIndex = $el.attr("data-index");
      const newEl = $(`<h2>${$el.html()}</h2>`);
      if (styleAttr) newEl.attr("style", styleAttr);
      if (dataIndex !== undefined) newEl.attr("data-index", dataIndex);
      $el.replaceWith(newEl);
      $el = newEl;
    }

    // -------------------
    // 🧾 TWO COLUMN HACK (also must run before further .css() calls)
    // -------------------
    const parts = text.split(/\s{2,}/).filter(Boolean);

    if (parts.length === 2 && text.length < 120) {
      const styleAttr = $el.attr("style");
      $el.html(`
        <div style="display:flex; justify-content:space-between;">
          <span>${parts[0]}</span>
          <span>${parts[1]}</span>
        </div>
      `);
      if (styleAttr) $el.attr("style", styleAttr);
    }

    // -------------------
    // 📄 PAGE BREAK
    // -------------------
    if (xml.pageBreak && text.length > 10) {
      $el.before(`<div class="page-break"></div>`);
    }

    // -------------------
    // 🎓 CERTIFICATE FIX
    // -------------------
    if (text === "CERTIFICATE") {
      $el.css({
        "text-align": "center",
        "font-weight": "bold",
        "margin-top": "40px"
      });
    }

    // -------------------
    // 📐 ALIGNMENT
    // -------------------
    if (xml.align === "center") {
      $el.css({
        "text-align": "center",
        "margin-left": "auto",
        "margin-right": "auto"
      });
    } else if (xml.align === "both") {
      $el.css("text-align", "justify");
    } else if (xml.align === "right") {
      $el.css("text-align", "right");
    }

    // -------------------
    // 📏 SPACING
    // -------------------
    if (xml.spacing?.["w:after"]) {
      const px = (parseInt(xml.spacing["w:after"]) / 20) * 1.33;
      $el.css("margin-bottom", `${px}px`);
    }

    if (xml.spacing?.["w:before"]) {
      const px = (parseInt(xml.spacing["w:before"]) / 20) * 1.33;
      $el.css("margin-top", `${px}px`);
    }

    // -------------------
    // 📐 INDENTATION
    // -------------------
    if (xml.indent?.["w:left"]) {
      const px = (parseInt(xml.indent["w:left"]) / 20) * 1.33;
      $el.css("margin-left", `${px}px`);
    }

    if (xml.indent?.["w:right"]) {
      const px = (parseInt(xml.indent["w:right"]) / 20) * 1.33;
      $el.css("margin-right", `${px}px`);
    }

    // -------------------
    // 🧠 TEXT PRESERVATION
    // -------------------
    if (text.includes("  ")) {
      $el.css("white-space", "pre-wrap");
    }
  });

  return $.html();
}

module.exports = { mergeStyles };