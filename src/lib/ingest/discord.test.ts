import { describe, expect, it } from 'vitest'
import { discordExportToSourceNote } from './discord'

const payload = {
  guild: { name: 'Grover' },
  channel: { name: 'general', id: '123' },
  messages: [
    { author: { name: 'alice', nickname: 'Ali' }, content: 'hello\nworld', timestamp: '2026-06-16T10:00:00.000Z' },
    { author: { name: 'bob' }, content: 'see this', timestamp: '2026-06-16T10:01:00.000Z', attachments: [{ url: 'https://cdn/x.png', fileName: 'x.png' }] },
  ],
}

describe('discordExportToSourceNote', () => {
  it('titles from guild + channel and renders messages as quotes', () => {
    const note = discordExportToSourceNote(payload)
    expect(note.source).toBe('discord')
    expect(note.title).toBe('Grover #general')
    expect(note.url).toBe('discord://channel/123')
    expect(note.body).toContain('**Ali** · 2026-06-16 10:00') // prefers nickname
    expect(note.body).toContain('> hello')
    expect(note.body).toContain('> world')
  })

  it('collects attachments as assets and links them', () => {
    const note = discordExportToSourceNote(payload)
    expect(note.assets).toEqual(['https://cdn/x.png'])
    expect(note.body).toContain('[x.png](https://cdn/x.png)')
  })

  it('handles an empty payload', () => {
    expect(discordExportToSourceNote({}).title).toBe('#channel')
  })
})
