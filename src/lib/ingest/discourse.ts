import { htmlToMarkdown } from './html'
import type { SourceNote } from './source'

/**
 * Discourse forum topic → Source note. Input is the topic JSON
 * (`/t/<slug>/<id>.json`): `{ title, post_stream: { posts: [{ username,
 * cooked (HTML), post_number }] } }`. Each post's `cooked` HTML is converted to
 * markdown. Pure (uses DOMParser for HTML).
 */

interface DiscoursePost {
  username?: string
  name?: string
  cooked?: string
  post_number?: number
}

interface DiscourseTopic {
  title?: string
  slug?: string
  id?: number
  post_stream?: { posts?: DiscoursePost[] }
}

/** True when a parsed JSON value looks like a Discourse topic. */
export function looksLikeDiscourse(value: unknown): boolean {
  return typeof value === 'object' && value !== null
    && Array.isArray((value as DiscourseTopic).post_stream?.posts)
}

export function discourseToSourceNote(payload: unknown, baseUrl = ''): SourceNote {
  const topic = (payload ?? {}) as DiscourseTopic
  const posts = topic.post_stream?.posts ?? []
  const title = topic.title || 'Forum topic'
  const author = posts[0]?.username || null
  const url = baseUrl && topic.slug && topic.id ? `${baseUrl.replace(/\/$/, '')}/t/${topic.slug}/${topic.id}` : ''

  const assets: string[] = []
  const body: string[] = []
  for (const post of posts) {
    const who = post.username || post.name || 'unknown'
    body.push(`**${who}**${post.post_number ? ` · #${post.post_number}` : ''}`, '')
    const { markdown, assets: postAssets } = htmlToMarkdown(post.cooked ?? '')
    body.push(markdown, '')
    for (const asset of postAssets) if (!assets.includes(asset)) assets.push(asset)
  }

  return { title, source: 'discourse', url, author, body: body.join('\n').trim(), assets }
}
