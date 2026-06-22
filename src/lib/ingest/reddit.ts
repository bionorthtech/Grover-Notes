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

const IMAGE_RE = /\.(png|jpe?g|gif|webp|bmp)(\?|$)/i

function collectAsset(url: string, assets: string[]): void {
  if (url && IMAGE_RE.test(url) && !assets.includes(url)) assets.push(url)
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
  collectAsset(str(post.url), assets)

  const body: string[] = []
  const meta = [subreddit, author ? `by u/${author}` : '', `${num(post.score)} points`].filter(Boolean)
  if (meta.length) body.push(`*${meta.join(' · ')}*`, '')
  if (selftext) body.push(selftext, '')
  body.push('## Comments', '')

  for (const child of listings[1]?.data?.children ?? []) {
    renderComment(child, 0, body, assets)
  }

  return { title, source: 'reddit', url: permalink, author, body: body.join('\n'), assets }
}
