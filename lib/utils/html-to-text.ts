// Naive HTML → readable text for blog/article link ingest.
// ponytail: regex strip, not a real DOM parser. Blog knowledge gets re-chunked
// and LLM-classified downstream, so precision here doesn't matter. Swap in
// @mozilla/readability if extraction quality on real blogs proves poor.

const ENTITIES: Record<string, string> = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"',
  "&#39;": "'", "&apos;": "'", "&nbsp;": " ", "&mdash;": "—", "&ndash;": "–",
};

export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|noscript|template|svg)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/(p|div|section|article|h[1-6]|li|br|tr)\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&[a-z#0-9]+;/gi, (m) => ENTITIES[m.toLowerCase()] ?? " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\s+|\s+$/gm, "")
    .trim();
}

// Best-effort <title> for a default doc title.
export function htmlTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? htmlToText(m[1]).slice(0, 200) || null : null;
}

if ((import.meta as { main?: boolean }).main) {
  const out = htmlToText(
    `<html><head><title>Hi &amp; Bye</title><style>.a{color:red}</style></head>` +
    `<body><h1>Deal terms</h1><p>Perpetual usage grants&nbsp;lose in arbitration.</p>` +
    `<script>evil()</script><ul><li>one</li><li>two</li></ul></body></html>`
  );
  console.assert(!/evil|color:red|<|>/.test(out), "tags/scripts leaked: " + out);
  console.assert(out.includes("Perpetual usage grants lose"), "entity/text lost: " + out);
  console.assert(out.includes("one") && out.includes("two"), "list items lost: " + out);
  console.assert(htmlTitle("<title>Hi &amp; Bye</title>") === "Hi & Bye", "title parse");
  console.log("html-to-text self-check ok");
}
