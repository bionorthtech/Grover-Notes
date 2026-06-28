/**
 * Minimal HTML → Markdown converter for ingest (Discourse `cooked` posts, web
 * clips). Uses the platform DOMParser (available in the app webview and in the
 * jsdom test env), so no extra dependency or binary. Handles the tags forums and
 * articles actually use; unknown tags fall back to their text content.
 */

export interface HtmlToMarkdownResult {
  markdown: string
  /** Image URLs encountered, for the Rust layer to download locally. */
  assets: string[]
}

const HEADINGS: Record<string, string> = { h1: '# ', h2: '## ', h3: '### ', h4: '#### ', h5: '##### ', h6: '###### ' }

function collapse(text: string): string {
  return text.replace(/\s+/g, ' ')
}

interface Ctx {
  assets: string[]
}

function serializeChildren(node: Node, ctx: Ctx): string {
  let out = ''
  node.childNodes.forEach((child) => { out += serialize(child, ctx) })
  return out
}

function serializeList(el: Element, ordered: boolean, ctx: Ctx): string {
  const items: string[] = []
  el.childNodes.forEach((child) => {
    if (child.nodeType === 1 && (child as Element).tagName.toLowerCase() === 'li') {
      const marker = ordered ? `${items.length + 1}. ` : '- '
      items.push(marker + serializeChildren(child, ctx).trim())
    }
  })
  return `\n${items.join('\n')}\n`
}

function serializeElement(el: Element, ctx: Ctx): string {
  const tag = el.tagName.toLowerCase()
  if (tag in HEADINGS) return `\n${HEADINGS[tag]}${serializeChildren(el, ctx).trim()}\n`
  switch (tag) {
    // Non-content elements: drop entirely so JS/CSS source never leaks as text.
    case 'script': case 'style': case 'noscript': case 'template': case 'svg': case 'head': return ''
    case 'p': case 'div': case 'section': case 'article': return `\n${serializeChildren(el, ctx).trim()}\n`
    case 'br': return '\n'
    case 'hr': return '\n---\n'
    case 'strong': case 'b': return `**${serializeChildren(el, ctx)}**`
    case 'em': case 'i': return `*${serializeChildren(el, ctx)}*`
    case 'code': return `\`${el.textContent ?? ''}\``
    case 'pre': return `\n\`\`\`\n${(el.textContent ?? '').trim()}\n\`\`\`\n`
    case 'blockquote': return `\n${serializeChildren(el, ctx).trim().split('\n').map((l) => `> ${l}`).join('\n')}\n`
    case 'a': {
      const href = el.getAttribute('href') ?? ''
      const text = serializeChildren(el, ctx).trim() || href
      return href ? `[${text}](${href})` : text
    }
    case 'img': {
      const src = el.getAttribute('src') ?? ''
      if (src && !ctx.assets.includes(src)) ctx.assets.push(src)
      return src ? `![${el.getAttribute('alt') ?? ''}](${src})` : ''
    }
    case 'ul': return serializeList(el, false, ctx)
    case 'ol': return serializeList(el, true, ctx)
    case 'li': return serializeChildren(el, ctx)
    default: return serializeChildren(el, ctx)
  }
}

function serialize(node: Node, ctx: Ctx): string {
  if (node.nodeType === 3) return collapse(node.textContent ?? '')
  if (node.nodeType === 1) return serializeElement(node as Element, ctx)
  return ''
}

/** Converts an HTML fragment to markdown, collecting image asset URLs. */
export function htmlToMarkdown(html: string): HtmlToMarkdownResult {
  const ctx: Ctx = { assets: [] }
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const markdown = serializeChildren(doc.body, ctx)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return { markdown, assets: ctx.assets }
}
