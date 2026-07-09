const { generateContent } = require("./aiGenerator");

function getRunText(r) {
  const t = r["w:t"]?.[0];
  if (t === undefined) return "";
  return typeof t === "string" ? t : (t._ || "");
}

function replaceParagraphText(p, newText) {
  const runs = p["w:r"] || [];
  if (runs.length === 0) return;

  if (runs.length === 1) {
    const needsPreserve = /^\s|\s$/.test(newText);
    runs[0]["w:t"] = [needsPreserve
      ? { _: newText, $: { "xml:space": "preserve" } }
      : newText];
    return;
  }

  const originalLengths = runs.map(r => getRunText(r).length);
  const totalLen = originalLengths.reduce((a, b) => a + b, 0);

  if (totalLen === 0) {
    runs[0]["w:t"] = [newText];
    for (let i = 1; i < runs.length; i++) runs[i]["w:t"] = [""];
    return;
  }

  let cursor = 0;
  runs.forEach((run, i) => {
    if (i === runs.length - 1) {
      run["w:t"] = [newText.slice(cursor) || ""];
      return;
    }
    const proportion = originalLengths[i] / totalLen;
    let end = cursor + Math.round(newText.length * proportion);
    while (end < newText.length && newText[end] !== " ") end++;
    const slice = newText.slice(cursor, end).trimEnd();
    const needsPreserve = /^\s|\s$/.test(slice);
    run["w:t"] = [needsPreserve ? { _: slice, $: { "xml:space": "preserve" } } : slice];
    // FIX 3: don't blindly skip cursor+1, only advance past the space if one exists
    cursor = end;
    if (newText[cursor] === " ") cursor++;
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
      console.log("\n===== AI OUTPUT =====");
rewritten.forEach((p, i) => {
    console.log(`Paragraph ${i + 1}:`);
    console.log(p);
    console.log();
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