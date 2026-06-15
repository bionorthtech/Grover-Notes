import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Button } from './ui/button'
import { Calendar } from './ui/calendar'
import { startOfToday } from '../utils/dailyNotes'

interface DailyNoteCalendarDialogProps {
  open: boolean
  /** Dates that already have a daily note (highlighted in the calendar). */
  existingDates: Date[]
  onPick: (date: Date) => void
  onCancel: () => void
}

function DailyNoteCalendarBody({ existingDates, onPick, onCancel }: Omit<DailyNoteCalendarDialogProps, 'open'>) {
  const today = startOfToday()
  const [month, setMonth] = useState(today)

  return (
    <DialogContent className="w-auto sm:max-w-[340px]" data-testid="daily-note-calendar">
      <DialogHeader>
        <DialogTitle>Daily notes</DialogTitle>
        <DialogDescription>Pick a day to open or create its note. Days with notes are marked.</DialogDescription>
      </DialogHeader>

      <Calendar
        mode="single"
        month={month}
        onMonthChange={setMonth}
        selected={today}
        onSelect={(date) => { if (date) { onPick(date); onCancel() } }}
        captionLayout="dropdown"
        navLayout="after"
        modifiers={{ hasNote: existingDates, today }}
        modifiersStyles={{
          hasNote: { fontWeight: 700, textDecoration: 'underline', textDecorationColor: 'var(--accent-blue)', textUnderlineOffset: '3px' },
        }}
      />

      <div className="flex justify-end">
        <Button onClick={() => { onPick(today); onCancel() }}>Open today</Button>
      </div>
    </DialogContent>
  )
}

/** Calendar picker for opening/creating daily notes. Mounted fresh on open. */
export function DailyNoteCalendarDialog({ open, existingDates, onPick, onCancel }: DailyNoteCalendarDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onCancel() }}>
      {open && <DailyNoteCalendarBody existingDates={existingDates} onPick={onPick} onCancel={onCancel} />}
    </Dialog>
  )
}
