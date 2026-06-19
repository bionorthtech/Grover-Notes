import { useCallback, useMemo, useState } from 'react'
import type { VaultEntry } from '../types'
import { groupTasks, toggleTaskLine, type TaskGroup } from '../lib/taskAggregation'

interface TaskSource {
  path: string
  title: string
  type: string | null
  content: string
}

export interface VaultTasksDeps {
  entries: VaultEntry[]
  readBody: (path: string) => Promise<string>
  /** Persists a note's updated body after a task toggle. */
  saveBody: (path: string, content: string) => Promise<void>
  /** Max notes to scan, to bound the read cost on large vaults. */
  scanLimit?: number
}

export interface VaultTasksApi {
  open: boolean
  loading: boolean
  groups: TaskGroup[]
  showDone: boolean
  setShowDone: (value: boolean) => void
  requestTasks: () => Promise<void>
  toggle: (path: string, lineIndex: number) => Promise<void>
  cancel: () => void
}

/** Aggregates checkbox tasks from across the vault into one checkable view. */
export function useVaultTasks(deps: VaultTasksDeps): VaultTasksApi {
  const { entries, readBody, saveBody, scanLimit = 300 } = deps
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sources, setSources] = useState<TaskSource[]>([])
  const [showDone, setShowDone] = useState(false)

  const groups = useMemo(() => groupTasks(sources, showDone), [sources, showDone])

  const requestTasks = useCallback(async () => {
    const candidates = entries.filter((entry) => !entry.archived && entry.isA !== 'Type').slice(0, scanLimit)
    setLoading(true)
    setOpen(true)
    try {
      const loaded = await Promise.all(candidates.map(async (entry) => ({
        path: entry.path,
        title: entry.title || entry.filename,
        type: entry.isA,
        content: await readBody(entry.path).catch(() => ''),
      })))
      setSources(loaded)
    } finally {
      setLoading(false)
    }
  }, [entries, readBody, scanLimit])

  const toggle = useCallback(async (path: string, lineIndex: number) => {
    const source = sources.find((item) => item.path === path)
    if (!source) return
    const content = toggleTaskLine(source.content, lineIndex)
    if (content === source.content) return
    setSources((prev) => prev.map((item) => (item.path === path ? { ...item, content } : item)))
    await saveBody(path, content)
  }, [sources, saveBody])

  const cancel = useCallback(() => setOpen(false), [])

  return { open, loading, groups, showDone, setShowDone, requestTasks, toggle, cancel }
}
