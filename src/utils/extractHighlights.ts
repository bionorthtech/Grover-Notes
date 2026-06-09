/**
 * Extracts all Markdown `==highlighted==` spans from note content.
 * Matches are single-line (a highlight never spans a line break), trimmed,
 * and returned in document order.
 */
export function extractHighlights(markdown: string): string[] {
  const highlights: string[] = []
  for (const match of markdown.matchAll(/==(.+?)==/g)) {
    const text = match[1].trim()
    if (text) highlights.push(text)
  }
  return highlights
}

/** Formats extracted highlights as a Markdown bullet list for the clipboard. */
export function formatHighlightsForClipboard(highlights: string[]): string {
  return highlights.map((highlight) => `- ${highlight}`).join('\n')
}
