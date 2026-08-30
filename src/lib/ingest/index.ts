import { redditThreadToSourceNote } from './reddit'
import { discourseToSourceNote, looksLikeDiscourse } from './discourse'
import { webClipToSourceNote } from './web'
import type { SourceNote } from './source'

export type { SourceNote, SourceKind } from './source'
export { buildSourceNoteMarkdown, sourceSlug, sourceTypeLabel } from './source'
export { redditThreadToSourceNote } from './reddit'
export { discourseToSourceNote } from './discourse'
export { webClipToSourceNote } from './web'
export { htmlToMarkdown } from './html'
export { rewriteAssetUrls } from './assets'

/**
 * Why a machine-readable code and not a message: these transforms are pure and
 * must stay free of any i18n dependency, so the UI layer owns the wording.
 */
export type DetectErrorCode =
  | 'empty'
  | 'not-json-or-html'
  | 'unrecognized'
  | 'not-http-url'
  | 'fetch-failed'

export type DetectResult =
  | { ok: true; note: SourceNote }
  | { ok: false; code: DetectErrorCode; detail?: string }

function looksLikeHtml(text: string): boolean {
  return /<\s*(html|body|div|p|article|h[1-6]|table)\b/i.test(text)
}

/**
 * Detects the source kind of pasted/exported data and transforms it into a
 * Source note: Reddit `.json` array, Discourse topic JSON, or a raw HTML
 * document (web clip).
 */
export function detectAndTransform(text: string): DetectResult {
  const trimmed = text.trim()
  if (!trimmed) return { ok: false, code: 'empty' }
  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    if (looksLikeHtml(trimmed)) return { ok: true, note: webClipToSourceNote(trimmed) }
    return { ok: false, code: 'not-json-or-html' }
  }
  if (Array.isArray(parsed)) return { ok: true, note: redditThreadToSourceNote(parsed) }
  if (looksLikeDiscourse(parsed)) return { ok: true, note: discourseToSourceNote(parsed) }
  return { ok: false, code: 'unrecognized' }
}
