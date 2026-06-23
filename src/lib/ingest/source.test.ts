import { describe, expect, it } from 'vitest'
import { buildSourceNoteMarkdown, sourceSlug, sourceTypeLabel, type SourceNote } from './source'

const note: SourceNote = {
  title: 'How do you organize: notes?',
  source: 'reddit',
  url: 'https://reddit.com/r/PKM/x',
  author: 'alice',
  body: '## Comments\n\n- **u/bob** hi',
  assets: [],
}

describe('source note model', () => {
  it('builds frontmatter + body, quoting values that need it', () => {
    const md = buildSourceNoteMarkdown(note, '2026-06-16T10:00:00Z')
    expect(md).toContain('type: Reddit Thread')
    expect(md).toContain('source: reddit')
    expect(md).toContain('"How do you organize: notes?"') // quoted (contains ':')
    expect(md).toContain('author: alice')
    expect(md).toContain('captured_at: 2026-06-16T10:00:00Z')
    expect(md).toContain('- **u/bob** hi')
  })

  it('quotes YAML-ambiguous bare titles so they stay strings', () => {
    for (const title of ['No', 'Yes', 'true', 'null', '123', '1.5']) {
      const md = buildSourceNoteMarkdown({ ...note, title }, '2026-06-16T10:00:00Z')
      expect(md).toContain(`title: ${JSON.stringify(title)}`)
    }
  })

  it('leaves an ordinary title unquoted', () => {
    const md = buildSourceNoteMarkdown({ ...note, title: 'Best PKM workflow' }, '2026-06-16T10:00:00Z')
    expect(md).toContain('title: Best PKM workflow')
  })

  it('omits absent url/author', () => {
    const md = buildSourceNoteMarkdown({ ...note, url: '', author: null }, '2026-06-16T10:00:00Z')
    expect(md).not.toContain('url:')
    expect(md).not.toContain('author:')
  })

  it('makes a filesystem-safe, source-prefixed slug', () => {
    expect(sourceSlug('reddit', 'How do you organize: notes?')).toBe('reddit-how-do-you-organize-notes')
    expect(sourceSlug('discord', '   ')).toBe('discord-untitled')
  })

  it('labels source kinds', () => {
    expect(sourceTypeLabel('discord')).toBe('Discord Channel')
  })
})
