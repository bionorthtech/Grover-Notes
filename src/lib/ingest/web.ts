import { htmlToMarkdown } from './html'
import type { SourceNote } from './source'

/**
 * Generic web clip → Source note. Converts an HTML document/fragment to markdown
 * and derives a title from <title> / <h1>. A light readability pass prefers the
 * page's <article>/<main> content and strips chrome (nav, header, footer, aside)
 * so the clip is the article, not the whole site. (The network fetch lives in
 * the Rust layer; this handles the conversion.)
 */

const CHROME_SELECTOR = 'nav, header, footer, aside'

/** Pick the best main-content element's HTML, stripping site chrome. */
function mainContentHtml(doc: Document): string {
  const container = doc.querySelector('article') ?? doc.querySelector('main') ?? doc.body
  if (!container) return ''
  const clone = container.cloneNode(true) as Element
  clone.querySelectorAll(CHROME_SELECTOR).forEach((node) => node.remove())
  return clone.innerHTML
}

export function webClipToSourceNote(html: string, url = ''): SourceNote {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const title = (doc.querySelector('title')?.textContent
    || doc.querySelector('h1')?.textContent
    || 'Web clip').trim()
  const { markdown, assets } = htmlToMarkdown(mainContentHtml(doc))
  return { title, source: 'web', url, author: null, body: markdown, assets }
}
