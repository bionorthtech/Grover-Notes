import { describe, expect, it } from 'vitest'
import {
  addDays,
  buildDailyNoteContent,
  dailyNoteHeading,
  dailyNotePath,
  dailyNoteTitle,
  isDailyNote,
  isSameDay,
  parseDailyNoteDate,
} from './dailyNotes'

const JUN_13 = new Date(2026, 5, 13) // months are 0-indexed

describe('dailyNoteTitle / dailyNotePath / dailyNoteHeading', () => {
  it('formats the canonical title and path', () => {
    expect(dailyNoteTitle(JUN_13)).toBe('2026-06-13')
    expect(dailyNotePath(JUN_13)).toBe('Daily Notes/2026-06-13.md')
    expect(dailyNotePath(JUN_13, 'Journal')).toBe('Journal/2026-06-13.md')
    expect(dailyNotePath(JUN_13, '')).toBe('2026-06-13.md')
  })

  it('formats a human heading', () => {
    expect(dailyNoteHeading(JUN_13)).toBe('Saturday, June 13, 2026')
  })

  it('builds daily note content with frontmatter and a dated heading', () => {
    expect(buildDailyNoteContent(JUN_13)).toBe(
      '---\ntitle: 2026-06-13\ntype: Note\n---\n\n# Saturday, June 13, 2026\n\n',
    )
  })
})

describe('parseDailyNoteDate / isDailyNote', () => {
  it('round-trips title, filename, and full path', () => {
    expect(parseDailyNoteDate('2026-06-13')).toEqual(JUN_13)
    expect(parseDailyNoteDate('2026-06-13.md')).toEqual(JUN_13)
    expect(parseDailyNoteDate('Daily Notes/2026-06-13.md')).toEqual(JUN_13)
  })

  it('rejects non-daily-note names', () => {
    expect(parseDailyNoteDate('Project Plan.md')).toBeNull()
    expect(parseDailyNoteDate('2026-13-40.md')).toBeNull() // invalid month/day
    expect(isDailyNote('Daily Notes/2026-06-13.md')).toBe(true)
    expect(isDailyNote('Meeting.md')).toBe(false)
  })
})

describe('date math', () => {
  it('adds and subtracts days across month boundaries', () => {
    expect(dailyNoteTitle(addDays(JUN_13, 1))).toBe('2026-06-14')
    expect(dailyNoteTitle(addDays(JUN_13, -13))).toBe('2026-05-31')
    expect(dailyNoteTitle(addDays(new Date(2026, 0, 1), -1))).toBe('2025-12-31')
  })

  it('compares calendar days ignoring time', () => {
    expect(isSameDay(new Date(2026, 5, 13, 9), new Date(2026, 5, 13, 23))).toBe(true)
    expect(isSameDay(JUN_13, addDays(JUN_13, 1))).toBe(false)
  })
})
