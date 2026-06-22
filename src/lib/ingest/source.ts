/**
 * Local-first archival ingest: shared "Source" note model. Every imported item
 * (Reddit thread, Discord channel, forum post, web clip) becomes a typed note
 * with provenance frontmatter so it flows into the typed graph, query engine,
 * vault health, and AI like any other note. Pure + synchronous.
 */

export type SourceKind = 'reddit' | 'discord' | 'discourse' | 'web'

const TYPE_LABEL: Record<SourceKind, string> = {
  reddit: 'Reddit Thread',
  discord: 'Discord Channel',
  discourse: 'Forum Post',
  web: 'Web Clip',
}

export interface SourceNote {
  /** Human title (used for the note title + slug). */
  title: string
  source: SourceKind
  url: string
  author: string | null
  /** Markdown body (without frontmatter). */
  body: string
  /** Remote asset URLs referenced by the content (downloaded by the Rust layer). */
  assets: string[]
}

/** Filesystem-safe slug for the imported note's filename. */
export function sourceSlug(source: SourceKind, title: string): string {
  const base = title.trim().toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'untitled'
  return `${source}-${base}`
}

function escapeYaml(value: string): string {
  return /[:#[\]{}"'\n]/.test(value) ? JSON.stringify(value) : value
}

/** Serializes a Source note to full markdown (frontmatter + body). */
export function buildSourceNoteMarkdown(note: SourceNote, capturedAtIso: string): string {
  const lines = ['---', `title: ${escapeYaml(note.title)}`, `type: ${TYPE_LABEL[note.source]}`, `source: ${note.source}`]
  if (note.url) lines.push(`url: ${escapeYaml(note.url)}`)
  if (note.author) lines.push(`author: ${escapeYaml(note.author)}`)
  lines.push(`captured_at: ${capturedAtIso}`, '---', '')
  return `${lines.join('\n')}\n${note.body.trimEnd()}\n`
}

/** Title label for a source kind (e.g. "Reddit Thread"). */
export function sourceTypeLabel(source: SourceKind): string {
  return TYPE_LABEL[source]
}
