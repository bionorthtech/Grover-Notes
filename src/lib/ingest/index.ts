import { redditThreadToSourceNote } from './reddit'
import { discordExportToSourceNote } from './discord'
import type { SourceNote } from './source'

export type { SourceNote, SourceKind } from './source'
export { buildSourceNoteMarkdown, sourceSlug, sourceTypeLabel } from './source'
export { redditThreadToSourceNote } from './reddit'
export { discordExportToSourceNote } from './discord'

export type DetectResult =
  | { ok: true; note: SourceNote }
  | { ok: false; error: string }

function looksLikeDiscordExport(value: unknown): boolean {
  return typeof value === 'object' && value !== null && Array.isArray((value as { messages?: unknown }).messages)
}

/**
 * Detects the source kind of pasted/exported data and transforms it into a
 * Source note. Reddit = the two-element `.json` array; Discord = a
 * DiscordChatExporter object with `messages[]`.
 */
export function detectAndTransform(text: string): DetectResult {
  const trimmed = text.trim()
  if (!trimmed) return { ok: false, error: 'Paste a Reddit thread .json payload or a Discord export.' }
  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    return { ok: false, error: 'That isn’t valid JSON.' }
  }
  if (Array.isArray(parsed)) return { ok: true, note: redditThreadToSourceNote(parsed) }
  if (looksLikeDiscordExport(parsed)) return { ok: true, note: discordExportToSourceNote(parsed) }
  return { ok: false, error: 'Unrecognized format — expected a Reddit thread .json or a Discord export.' }
}
