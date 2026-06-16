import type { VaultEntry } from '../types'
import { isInboxEntry } from '../utils/noteListHelpers'
import { extractVaultTypes } from '../utils/vaultTypes'

/**
 * AI auto-typing of inbox notes: pure helpers for selecting which notes need a
 * type, building the classification prompt, and validating the model's answer.
 * The orchestration (calling the AI, applying frontmatter) lives in the hook.
 */

export interface TypeSuggestion {
  type: string
  confidence: number
}

/** A note is a candidate if it's in the inbox and effectively untyped. */
export function selectInboxCandidates(entries: VaultEntry[], limit = 20): VaultEntry[] {
  return entries
    .filter((entry) => isInboxEntry(entry) && isUntyped(entry))
    .slice(0, limit)
}

function isUntyped(entry: VaultEntry): boolean {
  return entry.isA === null || entry.isA === 'Note'
}

const PROMPT_BODY_LIMIT = 2000

/** Builds the classification prompt for a single note against the vault's types. */
export function buildAutoTypePrompt(note: { title: string; body: string }, vaultTypes: string[]): string {
  const typeList = vaultTypes.length > 0 ? vaultTypes.join(', ') : '(none yet)'
  const body = note.body.slice(0, PROMPT_BODY_LIMIT)
  return [
    'Classify this note with the single most appropriate type.',
    `Existing vault types: ${typeList}.`,
    'Prefer an existing type; only propose a new short PascalCase type if none fit.',
    'Return JSON: {"type": "<TypeName>", "confidence": <0..1>}.',
    '',
    `Title: ${note.title || '(untitled)'}`,
    `Body:\n${body}`,
  ].join('\n')
}

/** System prompt shared across the batch. */
export function autoTypeSystemPrompt(): string {
  return 'You are a precise note classifier for a personal knowledge base. You only ever answer with the requested JSON.'
}

/** Type guard for the model's suggestion shape. */
export function isTypeSuggestion(value: unknown): value is TypeSuggestion {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return typeof candidate.type === 'string'
    && candidate.type.trim().length > 0
    && typeof candidate.confidence === 'number'
    && candidate.confidence >= 0
    && candidate.confidence <= 1
}

/** Convenience: vault types available for classification (excludes the meta "Type"). */
export function classifiableTypes(entries: VaultEntry[]): string[] {
  return extractVaultTypes(entries).filter((type) => type !== 'Type')
}

/** Below this confidence we surface the suggestion but never pre-select it. */
export const AUTO_TYPE_CONFIDENCE_FLOOR = 0.6
