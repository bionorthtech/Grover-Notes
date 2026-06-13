import { useCallback, useMemo, useState } from 'react'
import type { VaultEntry } from '../types'
import { trackEvent } from '../lib/telemetry'
import {
  buildLinkTargets,
  findUnlinkedMentions,
  type UnlinkedMention,
} from '../utils/unlinkedMentions'

export interface SuggestLinksDeps {
  entries: VaultEntry[]
  /** The note the command runs against, or null when none is open. */
  getActiveEntry: () => VaultEntry | null
  /** Live body markdown of the active note. */
  getActiveBody: () => string
  /** Writes a frontmatter key (here `related_to`) for a note. */
  updateFrontmatter: (path: string, key: string, value: string[]) => Promise<unknown>
  toast: (message: string) => void
}

export interface SuggestLinksState {
  /** Whether the suggestions dialog is open. */
  open: boolean
  /** Title of the note the suggestions belong to. */
  noteTitle: string
  /** Unlinked mentions found in the active note. */
  mentions: UnlinkedMention[]
  /** Run the scan for the active note and open the dialog (or toast if none). */
  requestSuggestLinks: () => void
  /** Add the chosen mentions to the note's related_to relationship. */
  confirm: (selectedPaths: string[]) => Promise<void>
  cancel: () => void
}

/** Normalises a related_to entry to a comparable display name (strips [[ ]] and alias). */
function relatedName(value: string): string {
  return value.replace(/^\[\[/, '').replace(/\]\]$/, '').split('|')[0].trim().toLowerCase()
}

/**
 * "Suggest links" — scans the active note's body for plain-text mentions of other
 * notes and offers to add them to the note's `related_to` relationship. Pure,
 * local, and private (no AI round-trip required).
 */
export function useSuggestLinks(deps: SuggestLinksDeps): SuggestLinksState {
  const { entries, getActiveEntry, getActiveBody, updateFrontmatter, toast } = deps
  const [open, setOpen] = useState(false)
  const [mentions, setMentions] = useState<UnlinkedMention[]>([])
  const [noteTitle, setNoteTitle] = useState('')
  const [activePath, setActivePath] = useState<string | null>(null)

  const entriesByPath = useMemo(() => new Map(entries.map((e) => [e.path, e])), [entries])

  const requestSuggestLinks = useCallback(() => {
    const entry = getActiveEntry()
    if (!entry) return
    const targets = buildLinkTargets(entries, entry.path)
    const found = findUnlinkedMentions(getActiveBody(), targets)
    // Drop notes already in this note's related_to so we only surface new links.
    const alreadyRelated = new Set(entry.relatedTo.map(relatedName))
    const fresh = found.filter((m) => !alreadyRelated.has(m.displayName.toLowerCase()))
    if (fresh.length === 0) {
      toast('No unlinked mentions found in this note.')
      return
    }
    setActivePath(entry.path)
    setNoteTitle(entry.title || entry.filename)
    setMentions(fresh)
    setOpen(true)
  }, [entries, getActiveEntry, getActiveBody, toast])

  const confirm = useCallback(async (selectedPaths: string[]) => {
    setOpen(false)
    const entry = activePath ? entriesByPath.get(activePath) : null
    if (!entry || selectedPaths.length === 0) return
    const chosen = mentions.filter((m) => selectedPaths.includes(m.path))
    const newLinks = chosen.map((m) => `[[${m.displayName}]]`)
    const existing = entry.relatedTo ?? []
    const merged = [...existing]
    for (const link of newLinks) {
      if (!merged.some((value) => relatedName(value) === relatedName(link))) merged.push(link)
    }
    await updateFrontmatter(entry.path, 'related_to', merged)
    trackEvent('suggest_links_applied', { offered: mentions.length, added: chosen.length })
    toast(`Linked ${chosen.length} ${chosen.length === 1 ? 'note' : 'notes'}.`)
  }, [activePath, entriesByPath, mentions, updateFrontmatter, toast])

  const cancel = useCallback(() => setOpen(false), [])

  return { open, noteTitle, mentions, requestSuggestLinks, confirm, cancel }
}
