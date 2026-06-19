import { describe, expect, it } from 'vitest'
import { groupTasks, parseTasksFromNote, toggleTaskLine } from './taskAggregation'

const NOTE = [
  '# Plan',
  '- [ ] Write the spec',
  '  - [x] Outline done',
  '* [X] Star-bullet task',
  '- [ ]   ', // empty task, ignored
  'not a task',
  '- [ ] Ship it',
].join('\n')

describe('parseTasksFromNote', () => {
  it('finds open and done tasks with their line indices, skipping empties', () => {
    const tasks = parseTasksFromNote(NOTE)
    expect(tasks).toEqual([
      { text: 'Write the spec', done: false, lineIndex: 1 },
      { text: 'Outline done', done: true, lineIndex: 2 },
      { text: 'Star-bullet task', done: true, lineIndex: 3 },
      { text: 'Ship it', done: false, lineIndex: 6 },
    ])
  })

  it('returns nothing for content without tasks', () => {
    expect(parseTasksFromNote('# Heading\n\njust prose')).toEqual([])
  })
})

describe('toggleTaskLine', () => {
  it('toggles an open task to done and back', () => {
    const once = toggleTaskLine(NOTE, 1)
    expect(once.split('\n')[1]).toBe('- [x] Write the spec')
    expect(toggleTaskLine(once, 1).split('\n')[1]).toBe('- [ ] Write the spec')
  })

  it('leaves non-task lines untouched', () => {
    expect(toggleTaskLine(NOTE, 5)).toBe(NOTE)
    expect(toggleTaskLine(NOTE, 999)).toBe(NOTE)
  })
})

describe('groupTasks', () => {
  const sources = [
    { path: '/v/a.md', title: 'A', type: 'Project', content: '- [ ] one\n- [ ] two\n- [x] done' },
    { path: '/v/b.md', title: 'B', type: null, content: '- [ ] only' },
    { path: '/v/c.md', title: 'C', type: null, content: 'no tasks here' },
  ]

  it('groups open tasks by note, most-open first, dropping empty notes', () => {
    const groups = groupTasks(sources, false)
    expect(groups.map((g) => g.title)).toEqual(['A', 'B'])
    expect(groups[0]).toMatchObject({ openCount: 2 })
    expect(groups[0].tasks).toHaveLength(2) // done task hidden
  })

  it('keeps completed tasks when showDone is true', () => {
    const groups = groupTasks(sources, true)
    expect(groups[0].tasks).toHaveLength(3)
  })
})
