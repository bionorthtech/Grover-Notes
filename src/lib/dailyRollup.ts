import type { VaultEntry } from '../types'
import { isDailyNote } from '../utils/dailyNotes'

/**
 * AI daily rollup: pure helpers for gathering the notes you touched today and
 * building the summary prompt. The AI call (aiTask) and the append to the daily
 * note live in the hook/App.
 */

export interface RollupNote {
  title: string
  snippet: string
}

const SECONDS_PER_DAY = 86400

/** Notes (content, not daily/Type/archived) modified on `day`, newest first. */
export function selectTodaysChangedNotes(entries: VaultEntry[], day: Date, limit = 25): VaultEntry[] {
  const start = Math.floor(new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime() / 1000)
  const end = start + SECONDS_PER_DAY
  return entries
    .filter((entry) =>
      !entry.archived
      && entry.isA !== 'Type'
      && !isDailyNote(entry.path)
      && entry.modifiedAt !== null
      && entry.modifiedAt >= start
      && entry.modifiedAt < end)
    .sort((a, b) => (b.modifiedAt ?? 0) - (a.modifiedAt ?? 0))
    .slice(0, limit)
}

const PROMPT_SNIPPET_LIMIT = 240

/** Builds the rollup prompt from the day's notes. */
export function buildRollupPrompt(notes: RollupNote[]): string {
  const lines = notes.map((note) => `- ${note.title}: ${note.snippet.slice(0, PROMPT_SNIPPET_LIMIT)}`.trim())
  return [
    'Summarize what I worked on today from these notes.',
    'Write 3–6 concise markdown bullet points grouping related work and surfacing themes or open threads.',
    'Do not invent details beyond the notes. Output only the bullet list.',
    '',
    lines.join('\n'),
  ].join('\n')
}

export function rollupSystemPrompt(): string {
  return 'You write terse, useful daily work summaries for a personal knowledge base.'
}

const ROLLUP_HEADING = '## Daily rollup'

/** Wraps the AI summary in a dated rollup section for appending to the daily note. */
export function formatRollupSection(summary: string): string {
  return `\n${ROLLUP_HEADING}\n\n${summary.trim()}\n`
}
