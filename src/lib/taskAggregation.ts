/**
 * Task aggregation: pure helpers for finding markdown checkbox tasks in note
 * bodies and toggling them. The orchestration (reading every note, writing back)
 * lives in the hook.
 */

export interface ParsedTask {
  /** Task text without the `- [ ]` marker. */
  text: string
  done: boolean
  /** 0-based line index in the source note (used to write the toggle back). */
  lineIndex: number
}

const TASK_LINE = /^(\s*)[-*]\s+\[([ xX])\]\s+(.*)$/

/** Extracts all checkbox tasks from a note's markdown body. */
export function parseTasksFromNote(content: string): ParsedTask[] {
  const tasks: ParsedTask[] = []
  const lines = content.split('\n')
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const match = TASK_LINE.exec(lines[lineIndex])
    if (!match) continue
    const text = match[3].trim()
    if (!text) continue
    tasks.push({ text, done: match[2].toLowerCase() === 'x', lineIndex })
  }
  return tasks
}

/** Returns the content with the task on `lineIndex` toggled done/undone. */
export function toggleTaskLine(content: string, lineIndex: number): string {
  const lines = content.split('\n')
  const line = lines[lineIndex]
  if (line === undefined) return content
  const match = TASK_LINE.exec(line)
  if (!match) return content
  const nextMark = match[2].toLowerCase() === 'x' ? ' ' : 'x'
  lines[lineIndex] = line.replace(/\[([ xX])\]/, `[${nextMark}]`)
  return lines.join('\n')
}

export interface TaskGroup {
  path: string
  title: string
  type: string | null
  openCount: number
  tasks: ParsedTask[]
}

/** Builds per-note task groups, dropping notes with no tasks. `showDone` keeps
 *  completed tasks visible; otherwise only open tasks are listed. */
export function groupTasks(
  sources: ReadonlyArray<{ path: string; title: string; type: string | null; content: string }>,
  showDone: boolean,
): TaskGroup[] {
  const groups: TaskGroup[] = []
  for (const source of sources) {
    const all = parseTasksFromNote(source.content)
    const tasks = showDone ? all : all.filter((task) => !task.done)
    if (tasks.length === 0) continue
    groups.push({
      path: source.path,
      title: source.title,
      type: source.type,
      openCount: all.filter((task) => !task.done).length,
      tasks,
    })
  }
  return groups.sort((a, b) => b.openCount - a.openCount)
}
