import { redditThreadToSourceNote } from './reddit'
import { discordExportToSourceNote } from './discord'
import { discourseToSourceNote, looksLikeDiscourse } from './discourse'
import { webClipToSourceNote } from './web'
import type { SourceNote } from './source'

export type { SourceNote, SourceKind } from './source'
export { buildSourceNoteMarkdown, sourceSlug, sourceTypeLabel } from './source'
export { redditThreadToSourceNote } from './reddit'
export { discordExportToSourceNote } from './discord'
export { discourseToSourceNote } from './discourse'
export { webClipToSourceNote } from './web'
export { htmlToMarkdown } from './html'

export type DetectResult =
  | { ok: true; note: SourceNote }
  | { ok: false; error: string }

function looksLikeDiscordExport(value: unknown): boolean {
  return typeof value === 'object' && value !== null && Array.isArray((value as { messages?: unknown }).messages)
}

function looksLikeHtml(text: string): boolean {
  return /<\s*(html|body|div|p|article|h[1-6]|table)\b/i.test(text)
}

/**
 * Detects the source kind of pasted/exported data and transforms it into a
 * Source note: Reddit `.json` array, Discord export, Discourse topic JSON, or a
 * raw HTML document (web clip).
 */
export function detectAndTransform(text: string): DetectResult {
  const trimmed = text.trim()
  if (!trimmed) return { ok: false, error: 'Paste a Reddit thread .json, a Discord/forum export, or an article’s HTML.' }
  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    if (looksLikeHtml(trimmed)) return { ok: true, note: webClipToSourceNote(trimmed) }
    return { ok: false, error: 'That isn’t valid JSON or HTML.' }
  }
  if (Array.isArray(parsed)) return { ok: true, note: redditThreadToSourceNote(parsed) }
  if (looksLikeDiscordExport(parsed)) return { ok: true, note: discordExportToSourceNote(parsed) }
  if (looksLikeDiscourse(parsed)) return { ok: true, note: discourseToSourceNote(parsed) }
  return { ok: false, error: 'Unrecognized format — expected Reddit/Discord/forum data or article HTML.' }
}
