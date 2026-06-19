import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Checkbox } from './ui/checkbox'
import { Switch } from './ui/switch'
import { ScrollArea } from './ui/scroll-area'
import { getTypeColor } from '../utils/typeColors'
import type { TaskGroup } from '../lib/taskAggregation'

interface TasksDialogProps {
  open: boolean
  loading: boolean
  groups: TaskGroup[]
  showDone: boolean
  onShowDoneChange: (value: boolean) => void
  onToggle: (path: string, lineIndex: number) => void
  onOpenNote: (path: string) => void
  onClose: () => void
}

function TaskGroupSection({ group, onToggle, onOpenNote }: {
  group: TaskGroup
  onToggle: (path: string, lineIndex: number) => void
  onOpenNote: (path: string) => void
}) {
  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => onOpenNote(group.path)}
        className="flex items-center gap-2 text-left text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: getTypeColor(group.type) }} />
        <span className="truncate">{group.title}</span>
        <span className="tabular-nums text-[var(--text-tertiary)]">{group.openCount}</span>
      </button>
      <div className="space-y-0.5 pl-1">
        {group.tasks.map((task) => (
          <label
            key={task.lineIndex}
            className="flex cursor-pointer items-start gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-[var(--state-hover)]"
          >
            <Checkbox checked={task.done} onCheckedChange={() => onToggle(group.path, task.lineIndex)} aria-label={task.text} className="mt-0.5" />
            <span className={`text-sm ${task.done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{task.text}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

/** Vault-wide checkbox task list, grouped by note, checkable in place. */
export function TasksDialog({ open, loading, groups, showDone, onShowDoneChange, onToggle, onOpenNote, onClose }: TasksDialogProps) {
  const total = groups.reduce((sum, group) => sum + group.tasks.length, 0)
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      {open && (
        <DialogContent className="sm:max-w-[520px]" data-testid="tasks-dialog">
          <DialogHeader>
            <DialogTitle>Tasks</DialogTitle>
            <DialogDescription>
              {loading ? 'Scanning your vault…' : `${total} ${showDone ? 'task' : 'open task'}${total === 1 ? '' : 's'} across ${groups.length} ${groups.length === 1 ? 'note' : 'notes'}.`}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
            <span>Show completed</span>
            <Switch checked={showDone} onCheckedChange={onShowDoneChange} aria-label="Show completed tasks" />
          </div>

          <ScrollArea className="max-h-[420px] pr-2">
            {loading ? null : groups.length === 0 ? (
              <div className="py-3 text-sm text-muted-foreground">No open tasks. Nice and clear. ✨</div>
            ) : (
              <div className="space-y-3">
                {groups.map((group) => (
                  <TaskGroupSection key={group.path} group={group} onToggle={onToggle} onOpenNote={onOpenNote} />
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      )}
    </Dialog>
  )
}
