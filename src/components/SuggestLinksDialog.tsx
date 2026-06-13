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
import type { UnlinkedMention } from '../utils/unlinkedMentions'

interface SuggestLinksDialogProps {
  open: boolean
  noteTitle: string
  mentions: UnlinkedMention[]
  onConfirm: (selectedPaths: string[]) => void
  onCancel: () => void
}

/** Inner body, mounted fresh each time the dialog opens so the selection state
 *  initialises from the current mentions without a reset effect. */
function SuggestLinksBody({ noteTitle, mentions, onConfirm, onCancel }: Omit<SuggestLinksDialogProps, 'open'>) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(mentions.map((m) => m.path)))

  const toggle = (path: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  return (
    <DialogContent className="sm:max-w-[460px]" data-testid="suggest-links-dialog">
      <DialogHeader>
        <DialogTitle>Suggest links</DialogTitle>
        <DialogDescription>
          {mentions.length} unlinked {mentions.length === 1 ? 'mention' : 'mentions'} found in “{noteTitle}”. Add the
          selected notes to this note’s related links.
        </DialogDescription>
      </DialogHeader>

      <ScrollArea className="max-h-[320px] pr-2">
        <div className="space-y-1">
          {mentions.map((mention) => (
            <label
              key={mention.path}
              className="flex w-full cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-[var(--state-hover)]"
            >
              <Checkbox
                checked={selected.has(mention.path)}
                onCheckedChange={() => toggle(mention.path)}
                aria-label={mention.displayName}
              />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium text-foreground">{mention.displayName}</span>
                <span className="truncate text-xs text-muted-foreground">matched “{mention.matchedText}”</span>
              </span>
            </label>
          ))}
        </div>
      </ScrollArea>

      <DialogFooter className="flex-row items-center justify-end gap-2 sm:justify-end">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onConfirm([...selected])} disabled={selected.size === 0}>
          Add {selected.size} {selected.size === 1 ? 'link' : 'links'}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}

/**
 * Lists the unlinked mentions found in a note and lets the user choose which to
 * add as `related_to` links. All mentions start selected.
 */
export function SuggestLinksDialog({ open, noteTitle, mentions, onConfirm, onCancel }: SuggestLinksDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onCancel() }}>
      {open && (
        <SuggestLinksBody noteTitle={noteTitle} mentions={mentions} onConfirm={onConfirm} onCancel={onCancel} />
      )}
    </Dialog>
  )
}
