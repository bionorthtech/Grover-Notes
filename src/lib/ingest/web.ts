import { htmlToMarkdown } from './html'
import type { SourceNote } from './source'

/**
 * Generic web clip → Source note. Converts an HTML document/fragment to markdown
 * and derives a title from <title> / <h1>. (Server-side readability extraction
 * and the network fetch live in the Rust layer; this handles the conversion.)
 */
export function webClipToSourceNote(html: string, url = ''): SourceNote {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const title = (doc.querySelector('title')?.textContent
    || doc.querySelector('h1')?.textContent
    || 'Web clip').trim()
  const { markdown, assets } = htmlToMarkdown(html)
  return { title, source: 'web', url, author: null, body: markdown, assets }
}
