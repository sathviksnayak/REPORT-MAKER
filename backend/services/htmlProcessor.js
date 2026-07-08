function extractSections(html) {
  html = html.replace(
    /<p>\s*<strong>([\s\S]*?)<\/strong>\s*<\/p>/g,
    (match, inner) => {
      const clean = inner.replace(/<\/?[^>]+>/g, "").trim();

      // Only promote to a heading if it actually looks like one:
      // - not empty, not absurdly long (real headings are short)
      // - not just a number or numbering fragment (e.g. "1.2")
      // - not something ending in ":" that's really a label (e.g. "Name:", "Date:")
      const looksLikeHeading =
        clean.length > 3 &&
        clean.length < 80 &&
        !/^[\d.\s]+$/.test(clean) &&
        !/:$/.test(clean);

      return looksLikeHeading ? `<h1>${clean}</h1>` : match;
    }
  );

  const parts = html.split(/<h1[^>]*>/);

  return parts
    .slice(1)
    .map((part) => {
      const [titlePart, ...rest] = part.split("</h1>");

      const title = titlePart.replace(/<\/?[^>]+>/g, "").trim();
      const content = rest.join("</h1>").trim();

      const rawParagraphs =
        content.match(/<p[^>]*>[\s\S]*?<\/p>/gi) || [];

      const paragraphs = rawParagraphs.map((p) => {
        const match = p.match(/data-index="(\d+)"/);

        const xmlIndex = match ? Number(match[1]) : -1;

        const text = p
          .replace(/<[^>]+>/g, "")
          .replace(/\s+/g, " ")
          .trim();

        return {
          xmlIndex,
          text,
        };
      });

      if (paragraphs.some((p) => p.xmlIndex === -1)) {
        console.warn(
          `Section "${title}" contains ${paragraphs.filter((p) => p.xmlIndex === -1).length} paragraph(s) without xmlIndex`
        );
      }

      return {
        title,
        content,
        paragraphs,
      };
    })
    // Drop sections that ended up empty — this is what was producing
    // the {title:"", content:"", paragraphs:[]} garbage you saw in the logs.
    .filter((section) => section.title && section.paragraphs.length > 0);
}

module.exports = { extractSections };