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
import { Textarea } from './ui/textarea'

interface QuickCaptureDialogProps {
  open: boolean
  onSubmit: (text: string) => void
  onCancel: () => void
}

function QuickCaptureBody({ onSubmit, onCancel }: Omit<QuickCaptureDialogProps, 'open'>) {
  const [text, setText] = useState('')

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      onSubmit(text)
    }
  }

  return (
    <DialogContent className="sm:max-w-[480px]" data-testid="quick-capture-dialog">
      <DialogHeader>
        <DialogTitle>Quick capture</DialogTitle>
        <DialogDescription>Jot a thought — it’s appended to today’s daily note.</DialogDescription>
      </DialogHeader>

      <Textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="What’s on your mind?"
        className="min-h-[120px] resize-none"
      />

      <DialogFooter className="flex-row items-center justify-between gap-2 sm:justify-between">
        <span className="text-xs text-muted-foreground">⌘/Ctrl + Enter to save</span>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => onSubmit(text)} disabled={!text.trim()}>Capture</Button>
        </div>
      </DialogFooter>
    </DialogContent>
  )
}

/** Modal for quick-capturing text into today's daily note. Mounted fresh on open. */
export function QuickCaptureDialog({ open, onSubmit, onCancel }: QuickCaptureDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onCancel() }}>
      {open && <QuickCaptureBody onSubmit={onSubmit} onCancel={onCancel} />}
    </Dialog>
  )
}
