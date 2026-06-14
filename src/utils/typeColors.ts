/**
 * Maps note types to their accent color CSS variables.
 * Single source of truth for type→color mapping used across Sidebar, NoteList, and Inspector.
 */

import type { VaultEntry } from '../types'
import { isValidCssColor } from './colorUtils'

/** Builds a map from type name → Type document entry (for custom color/icon lookup).
 *  Stores both original title and lowercase version so lookups work regardless
 *  of whether instances use `isA: Config` or `isA: config`. */
export function buildTypeEntryMap(entries: VaultEntry[]): Record<string, VaultEntry> {
  const map: Record<string, VaultEntry> = {}
  for (const e of entries) {
    if (e.isA === 'Type') {
      Reflect.set(map, e.title, e)
      const lower = e.title.toLowerCase()
      if (lower !== e.title) Reflect.set(map, lower, e)
    }
  }
  return map
}

// Grover identity: type tags default to the brand green. Users can still assign a
// custom per-type colour, which takes precedence (see getTypeColor).
const TYPE_COLOR_MAP: Record<string, string> = {
  Project: 'var(--accent-blue)',
  Experiment: 'var(--accent-blue)',
  Responsibility: 'var(--accent-blue)',
  Procedure: 'var(--accent-blue)',
  Person: 'var(--accent-blue)',
  Event: 'var(--accent-blue)',
  Topic: 'var(--accent-blue)',
  Type: 'var(--accent-blue)',
}

const TYPE_LIGHT_COLOR_MAP: Record<string, string> = {
  Project: 'var(--accent-blue-light)',
  Experiment: 'var(--accent-blue-light)',
  Responsibility: 'var(--accent-blue-light)',
  Procedure: 'var(--accent-blue-light)',
  Person: 'var(--accent-blue-light)',
  Event: 'var(--accent-blue-light)',
  Topic: 'var(--accent-blue-light)',
  Type: 'var(--accent-blue-light)',
}

// A note with NO type at all stays neutral grey.
const DEFAULT_COLOR = 'var(--muted-foreground)'
const DEFAULT_LIGHT_COLOR = 'var(--muted)'

// Grover identity: a note that HAS a type but no explicit colour falls back to the
// brand green (not grey) so the sidebar, inspector, wikilinks, and graph stay a
// cohesive green. A custom per-type colour still takes precedence.
const UNCOLORED_TYPE_COLOR = 'var(--accent-blue)'
const UNCOLORED_TYPE_LIGHT_COLOR = 'var(--accent-blue-light)'

/** Color key → CSS variable mapping for the design system accent palette */
export const ACCENT_COLORS: { key: string; label: string; css: string; cssLight: string }[] = [
  { key: 'red', label: 'Red', css: 'var(--accent-red)', cssLight: 'var(--accent-red-light)' },
  { key: 'orange', label: 'Orange', css: 'var(--accent-orange)', cssLight: 'var(--accent-orange-light)' },
  { key: 'yellow', label: 'Yellow', css: 'var(--accent-yellow)', cssLight: 'var(--accent-yellow-light)' },
  { key: 'green', label: 'Green', css: 'var(--accent-green)', cssLight: 'var(--accent-green-light)' },
  { key: 'blue', label: 'Blue', css: 'var(--swatch-blue)', cssLight: 'var(--swatch-blue-light)' },
  { key: 'purple', label: 'Purple', css: 'var(--accent-purple)', cssLight: 'var(--accent-purple-light)' },
  { key: 'teal', label: 'Teal', css: 'var(--accent-teal)', cssLight: 'var(--accent-teal-light)' },
  { key: 'pink', label: 'Pink', css: 'var(--accent-pink)', cssLight: 'var(--accent-pink-light)' },
  { key: 'gray', label: 'Gray', css: 'var(--accent-gray)', cssLight: 'var(--accent-gray-light)' },
]

export const ACCENT_COLOR_PICKER_KEYS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'gray'] as const
export const ACCENT_COLOR_PICKER_COLORS = ACCENT_COLOR_PICKER_KEYS
  .map((key) => ACCENT_COLORS.find((color) => color.key === key) ?? null)
  .filter((color): color is typeof ACCENT_COLORS[number] => color !== null)

const COLOR_KEY_TO_CSS: Record<string, string> = Object.fromEntries(
  ACCENT_COLORS.map((c) => [c.key, c.css]),
)
const COLOR_KEY_TO_CSS_LIGHT: Record<string, string> = Object.fromEntries(
  ACCENT_COLORS.map((c) => [c.key, c.cssLight]),
)
const COLOR_KEY_TO_CSS_LOOKUP = new Map(Object.entries(COLOR_KEY_TO_CSS))
const COLOR_KEY_TO_CSS_LIGHT_LOOKUP = new Map(Object.entries(COLOR_KEY_TO_CSS_LIGHT))
const TYPE_COLOR_LOOKUP = new Map(Object.entries(TYPE_COLOR_MAP))
const TYPE_LIGHT_COLOR_LOOKUP = new Map(Object.entries(TYPE_LIGHT_COLOR_MAP))

const CSS_COLOR_LIGHT_MIX = 14

function resolveCustomColor(customColorKey?: string | null): string | null {
  const color = customColorKey?.trim()
  if (!color) return null

  const paletteKey = color.toLowerCase()
  return COLOR_KEY_TO_CSS_LOOKUP.get(paletteKey) ?? (isValidCssColor(color) ? color : null)
}

function resolveCustomLightColor(customColorKey?: string | null): string | null {
  const color = customColorKey?.trim()
  if (!color) return null

  const paletteKey = color.toLowerCase()
  return COLOR_KEY_TO_CSS_LIGHT_LOOKUP.get(paletteKey)
    ?? (isValidCssColor(color) ? `color-mix(in srgb, ${color} ${CSS_COLOR_LIGHT_MIX}%, transparent)` : null)
}

/** Returns the CSS variable for the accent color of a given note type, with optional custom override */
export function getTypeColor(isA: string | null, customColorKey?: string | null): string {
  const customColor = resolveCustomColor(customColorKey)
  if (customColor) return customColor
  if (!isA) return DEFAULT_COLOR
  return TYPE_COLOR_LOOKUP.get(isA) ?? UNCOLORED_TYPE_COLOR
}

/** Returns the CSS variable for the light/background variant of a given note type's color */
export function getTypeLightColor(isA: string | null, customColorKey?: string | null): string {
  const customLightColor = resolveCustomLightColor(customColorKey)
  if (customLightColor) return customLightColor
  if (!isA) return DEFAULT_LIGHT_COLOR
  return TYPE_LIGHT_COLOR_LOOKUP.get(isA) ?? UNCOLORED_TYPE_LIGHT_COLOR
}
