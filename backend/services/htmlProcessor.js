function extractSections(html) {
  html = html.replace(
    /<p>\s*<strong>([\s\S]*?)<\/strong>\s*<\/p>/g,
    (match, inner) => {
      const clean = inner.replace(/<\/?[^>]+>/g, "").trim();
      return `<h1>${clean}</h1>`;
    }
  );

  const parts = html.split(/<h1[^>]*>/);

  return parts.slice(1).map((part) => {
    const [titlePart, ...rest] = part.split("</h1>");

    const title = titlePart.replace(/<\/?[^>]+>/g, "").trim();
    const content = rest.join("</h1>").trim();

    const rawParagraphs =
      content.match(/<p[^>]*>[\s\S]*?<\/p>/gi) || [];

    const paragraphs = rawParagraphs.map((p) => {

      const match = p.match(/data-index="(\d+)"/);

      const xmlIndex = match
        ? Number(match[1])
        : -1;

      const text = p
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

      return {
        xmlIndex,
        text
      };
    });

    return {
      title,
      content,
      paragraphs
    };
  });
}

module.exports = { extractSections };