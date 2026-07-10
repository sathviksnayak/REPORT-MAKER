const { generateContent } = require("./aiGenerator");

function getRunText(run) {
    const textNodes = run.getElementsByTagName("w:t");

    let text = "";

    for (let i = 0; i < textNodes.length; i++) {
        text += textNodes[i].textContent;
    }

    return text;
}

function replaceParagraphText(paragraph, newText) {

    const runs = Array.from(paragraph.getElementsByTagName("w:r"));

    if (runs.length === 0) return;

    const textNodes = runs.map(run => {
        const nodes = run.getElementsByTagName("w:t");
        return nodes.length ? nodes[0] : null;
    });

    const originalLengths = textNodes.map(node =>
        node ? node.textContent.length : 0
    );

    const totalLen = originalLengths.reduce((a, b) => a + b, 0);

    // Only one run
    if (textNodes.length === 1) {
        if (textNodes[0]) {
            textNodes[0].textContent = newText;
        }
        return;
    }

    // Empty paragraph
    if (totalLen === 0) {
        if (textNodes[0]) {
            textNodes[0].textContent = newText;
        }

        for (let i = 1; i < textNodes.length; i++) {
            if (textNodes[i]) textNodes[i].textContent = "";
        }

        return;
    }

    let cursor = 0;

    textNodes.forEach((node, i) => {

        if (!node) return;

        if (i === textNodes.length - 1) {
            node.textContent = newText.slice(cursor);
            return;
        }

        const proportion = originalLengths[i] / totalLen;

        let end = cursor + Math.round(newText.length * proportion);

        while (end < newText.length && newText[end] !== " ") {
            end++;
        }

        node.textContent = newText.slice(cursor, end);

        cursor = end;

        if (newText[cursor] === " ") {
            cursor++;
        }
    });
}

function reconcile(returned, expected) {
  if (returned.length === expected) return returned;

  if (returned.length > expected) {
    const head = returned.slice(0, expected - 1);
    const tail = returned.slice(expected - 1).join(" ");
    return [...head, tail];
  }

  const result = [...returned];
  while (result.length < expected) {
    let longest = 0;
    for (let i = 1; i < result.length; i++) {
      if (result[i].length > result[longest].length) longest = i;
    }
    const text = result[longest];
    const mid = Math.floor(text.length / 2);
    let split = text.indexOf(". ", mid);
    if (split === -1) split = text.lastIndexOf(" ", mid);
    if (split === -1) split = mid;
    result.splice(longest, 1,
      text.slice(0, split + 1).trim(),
      text.slice(split + 1).trim()
    );
  }
  return result;
}

async function rewriteSections(sections, topic) {
  for (const section of sections) {
    const paragraphItems = section.content.filter(c => c.type === "paragraph");
    if (paragraphItems.length === 0) continue;

    // FIX 4: log which section we're processing and how many paragraphs
    console.log(`Rewriting "${section.title}": ${paragraphItems.length} paragraph(s)`);

    // FIX 1: map originalText to text so aiGenerator receives actual content
    const paragraphInputs = paragraphItems.map(item => ({
      text: item.originalText
    }));

    let rewritten;
    try {
      rewritten = await generateContent(section.title, topic, paragraphInputs);
      rewritten.forEach((p, i) => {
    console.log(`Paragraph ${i + 1}: ${
        p === paragraphInputs[i].text ? "UNCHANGED" : "CHANGED"
    }`);
});


    } catch (err) {
      console.error(`AI failed for "${section.title}":`, err.message);
      continue;
    }

    // FIX 4: log what came back
    console.log(`  AI returned ${rewritten.length} paragraph(s)`);

    // FIX 5: validate all items are strings before reconciling
    if (!rewritten.every(p => typeof p === "string")) {
      console.error(`Invalid AI response for "${section.title}", skipping`);
      continue;
    }

    if (rewritten.length === 0) {
      console.warn(`Empty response for "${section.title}", skipping`);
      continue;
    }

    const reconciled = reconcile(rewritten, paragraphItems.length);

    paragraphItems.forEach((item, i) => {
      if (reconciled[i]) {
        replaceParagraphText(item.node, reconciled[i]);
      }
    });
  }
}

module.exports = { rewriteSections };