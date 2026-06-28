import type { SourceNote } from './source'

/**
 * Reddit thread → Source note. Input is the JSON you get by appending `.json`
 * to a thread URL: a two-element array `[postListing, commentsListing]`.
 * Comment `body` is already markdown, so this is a pure structural transform.
 * Pure + synchronous; the network fetch lives in the Rust layer.
 */

interface RedditThing {
  kind?: string
  data?: Record<string, unknown>
}

interface RedditListing {
  data?: { children?: RedditThing[] }
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function num(value: unknown): number {
  return typeof value === 'number' ? value : 0
}

function obj(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

const IMAGE_RE = /\.(png|jpe?g|gif|webp|bmp)(\?|$)/i

// Reddit HTML-escapes ampersands in media URLs (&amp;), which breaks the link.
function unescapeUrl(url: string): string {
  return url.replace(/&amp;/g, '&')
}

/** Embed an image in the body and record it as a downloadable asset, once. */
function embedImage(url: string, lines: string[], assets: string[]): void {
  const clean = unescapeUrl(url)
  if (!clean || assets.includes(clean)) return
  assets.push(clean)
  lines.push(`![](${clean})`, '')
}

/** URL of a single gallery/preview media entry (still image or animation). */
function mediaUrl(meta: Record<string, unknown>): string {
  const source = obj(meta.s)
  return str(source.u) || str(source.gif) || str(source.mp4)
}

/** Gallery posts hold image ids in `gallery_data`, resolved via `media_metadata`. */
function collectGallery(post: Record<string, unknown>, lines: string[], assets: string[]): void {
  const items = obj(post.gallery_data).items
  const metadata = obj(post.media_metadata)
  if (!Array.isArray(items)) return
  for (const item of items) {
    const url = mediaUrl(obj(metadata[str(obj(item).media_id)]))
    if (url) embedImage(url, lines, assets)
  }
}

/** First preview image URL, if the post carries a `preview.images[]` block. */
function previewUrl(post: Record<string, unknown>): string {
  const images = obj(post.preview).images
  const first = Array.isArray(images) ? obj(images[0]) : {}
  return str(obj(first.source).url)
}

/** Embed the post's images: a direct image link, a gallery, or the preview. */
function collectPostMedia(post: Record<string, unknown>, lines: string[], assets: string[]): void {
  const direct = str(post.url)
  if (IMAGE_RE.test(direct)) embedImage(direct, lines, assets)
  collectGallery(post, lines, assets)
  if (assets.length === 0) embedImage(previewUrl(post), lines, assets)
}

function renderComment(thing: RedditThing, depth: number, lines: string[], assets: string[]): void {
  if (thing.kind !== 't1' || !thing.data) return
  const data = thing.data
  const author = str(data.author) || '[deleted]'
  const score = num(data.score)
  const body = str(data.body).trim()
  const indent = '  '.repeat(depth)
  lines.push(`${indent}- **u/${author}** · ${score} point${score === 1 ? '' : 's'}`)
  for (const line of (body || '[deleted]').split('\n')) lines.push(`${indent}  ${line}`)

  const replies = data.replies
  if (replies && typeof replies === 'object') {
    for (const child of (replies as RedditListing).data?.children ?? []) {
      renderComment(child, depth + 1, lines, assets)
    }
  }
}

/** Transforms a Reddit thread `.json` payload into a Source note. */
export function redditThreadToSourceNote(payload: unknown): SourceNote {
  const listings = Array.isArray(payload) ? (payload as RedditListing[]) : []
  const post = listings[0]?.data?.children?.[0]?.data ?? {}
  const title = str(post.title) || 'Reddit thread'
  const author = str(post.author) || null
  const subreddit = str(post.subreddit_name_prefixed) || (post.subreddit ? `r/${str(post.subreddit)}` : '')
  const permalink = str(post.permalink) ? `https://www.reddit.com${str(post.permalink)}` : str(post.url)
  const selftext = str(post.selftext).trim()

  const assets: string[] = []
  const body: string[] = []
  const meta = [subreddit, author ? `by u/${author}` : '', `${num(post.score)} points`].filter(Boolean)
  if (meta.length) body.push(`*${meta.join(' · ')}*`, '')
  if (selftext) body.push(selftext, '')
  collectPostMedia(post, body, assets)
  body.push('## Comments', '')

  for (const child of listings[1]?.data?.children ?? []) {
    renderComment(child, 0, body, assets)
  }

  return { title, source: 'reddit', url: permalink, author, body: body.join('\n'), assets }
}
