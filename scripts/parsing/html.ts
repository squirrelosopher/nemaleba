const TAG_PATTERN = /<[^>]*>/g;
const EMBEDDED_CODE = /<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi;
const ENTITIES: Record<string, string> = {
  '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>',
  '&quot;': '"', '&#039;': "'", '&#8220;': '"', '&#8221;': '"',
  '&#8222;': '"', '&#8211;': '–', '&#8217;': "'", '&hellip;': '…'
};

const MAX_CODE_POINT = 0x10ffff;

// Typographic quotes are flattened whichever way the page wrote them, so "&#x201E;" from
// one editor reads the same as "&#8222;" from another.
function fromCodePoint(code: number, reference: string): string {
  if (code > MAX_CODE_POINT) {
    return reference;
  }

  return ENTITIES[`&#${code};`] ?? String.fromCodePoint(code);
}

export function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (match, code: string) => fromCodePoint(Number(code), match))
    .replace(/&#x([\da-f]+);/gi, (match, code: string) =>
      fromCodePoint(parseInt(code, 16), match)
    )
    .replace(/&[a-z]+;/gi, (match) => ENTITIES[match] ?? match);
}

export function stripTags(html: string): string {
  return decodeEntities(
    html.replace(EMBEDDED_CODE, ' ').replace(/<br\s*\/?>/gi, '\n').replace(TAG_PATTERN, ' ')
  );
}

export function collapseWhitespace(text: string): string {
  return text.replace(/[ \t ]+/g, ' ').trim();
}

export function textOf(html: string): string {
  return collapseWhitespace(stripTags(html));
}

export function extractRows(html: string): string[][] {
  const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) ?? [];

  return rows.map((row) => {
    const cells = row.match(/<td[^>]*>[\s\S]*?<\/td>/gi) ?? [];
    return cells.map(textOf);
  });
}
