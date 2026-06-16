import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Button } from './ui/button'
import { Checkbox } from './ui/checkbox'
import { ScrollArea } from './ui/scroll-area'
import { getTypeColor } from '../utils/typeColors'
import { AUTO_TYPE_CONFIDENCE_FLOOR, withinConfidence, type AutoTypeRow } from '../hooks/useAutoTypeInbox'

interface AutoTypeInboxDialogProps {
  open: boolean
  rows: AutoTypeRow[]
  onApply: (selectedPaths: string[]) => void
  onCancel: () => void
}

function TypeChip({ type }: { type: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-xs font-medium">
      <span className="size-2 rounded-full" style={{ backgroundColor: getTypeColor(type) }} />
      {type}
    </span>
  )
}

function AutoTypeInboxBody({ rows, onApply, onCancel }: Omit<AutoTypeInboxDialogProps, 'open'>) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(rows.filter((row) => withinConfidence(row.confidence)).map((row) => row.path)),
  )

  const toggle = (path: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  return (
    <DialogContent className="sm:max-w-[520px]" data-testid="auto-type-dialog">
      <DialogHeader>
        <DialogTitle>Auto-type inbox notes</DialogTitle>
        <DialogDescription>
          Suggested types for {rows.length} untyped {rows.length === 1 ? 'note' : 'notes'}. Low-confidence
          suggestions (under {Math.round(AUTO_TYPE_CONFIDENCE_FLOOR * 100)}%) start unchecked.
        </DialogDescription>
      </DialogHeader>

      <ScrollArea className="max-h-[360px] pr-2">
        <div className="space-y-1">
          {rows.map((row) => (
            <label
              key={row.path}
              className="flex w-full cursor-pointer items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-[var(--state-hover)]"
            >
              <Checkbox checked={selected.has(row.path)} onCheckedChange={() => toggle(row.path)} aria-label={row.title} />
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="truncate text-sm font-medium text-foreground">{row.title}</span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{row.currentType ?? 'untyped'}</span>
                  <span aria-hidden>→</span>
                  <TypeChip type={row.suggestedType} />
                </span>
              </span>
              <span className="shrink-0 text-xs tabular-nums text-[var(--text-tertiary)]">
                {Math.round(row.confidence * 100)}%
              </span>
            </label>
          ))}
        </div>
      </ScrollArea>

      <DialogFooter className="flex-row items-center justify-end gap-2 sm:justify-end">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onApply([...selected])} disabled={selected.size === 0}>
          Apply {selected.size} {selected.size === 1 ? 'type' : 'types'}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}

/** Review dialog for AI-suggested inbox note types. Mounted fresh on open. */
export function AutoTypeInboxDialog({ open, rows, onApply, onCancel }: AutoTypeInboxDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onCancel() }}>
      {open && <AutoTypeInboxBody rows={rows} onApply={onApply} onCancel={onCancel} />}
    </Dialog>
  )
}
