import { useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { ScrollArea } from './ui/scroll-area'
import { getTypeColor } from '../utils/typeColors'
import { computeVaultStats } from '../lib/vaultStats'
import type { VaultEntry } from '../types'

interface VaultStatsDialogProps {
  open: boolean
  entries: VaultEntry[]
  onClose: () => void
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border px-3 py-2">
      <div className="text-lg font-semibold tabular-nums text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

function VaultStatsBody({ entries }: { entries: VaultEntry[] }) {
  const stats = useMemo(() => computeVaultStats(entries), [entries])
  const maxTypeCount = stats.byType.reduce((max, item) => Math.max(max, item.count), 0)

  return (
    <DialogContent className="sm:max-w-[520px]" data-testid="vault-stats-dialog">
      <DialogHeader>
        <DialogTitle>Vault stats</DialogTitle>
        <DialogDescription>A quick overview of your vault.</DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard label="Notes" value={stats.totalNotes} />
        <StatCard label="Words" value={stats.totalWords.toLocaleString()} />
        <StatCard label="New this week" value={stats.createdThisWeek} />
        <StatCard label="Avg links" value={stats.avgOutgoingLinks} />
      </div>

      <ScrollArea className="max-h-[300px] pr-2">
        <div className="space-y-1.5">
          <div className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">By type</div>
          {stats.byType.map((item) => (
            <div key={item.type} className="flex items-center gap-2 text-sm">
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: getTypeColor(item.type === 'Untyped' ? null : item.type) }} />
              <span className="w-32 shrink-0 truncate text-foreground">{item.type}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--surface-app)]">
                <span className="block h-full rounded-full bg-[var(--accent-blue)]" style={{ width: `${maxTypeCount > 0 ? (item.count / maxTypeCount) * 100 : 0}%` }} />
              </span>
              <span className="w-8 shrink-0 text-right tabular-nums text-muted-foreground">{item.count}</span>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="flex flex-wrap gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
        <span>{stats.untyped} untyped</span>
        <span aria-hidden>·</span>
        <span>{stats.orphans} orphans</span>
        <span aria-hidden>·</span>
        <span>{stats.brokenLinks} broken links</span>
      </div>
    </DialogContent>
  )
}

/** Vault-wide overview stats. Mounted fresh on open. */
export function VaultStatsDialog({ open, entries, onClose }: VaultStatsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      {open && <VaultStatsBody entries={entries} />}
    </Dialog>
  )
}
