import { describe, expect, it } from 'vitest'
import { detectAndTransform } from './index'

describe('detectAndTransform', () => {
  it('detects a Reddit array payload', () => {
    const result = detectAndTransform(JSON.stringify([
      { data: { children: [{ kind: 't3', data: { title: 'Hi', author: 'a', subreddit: 'x', permalink: '/p' } }] } },
      { data: { children: [] } },
    ]))
    expect(result.ok && result.note.source).toBe('reddit')
  })

  it('detects a Discord export object', () => {
    const result = detectAndTransform(JSON.stringify({ channel: { name: 'general' }, messages: [] }))
    expect(result.ok && result.note.source).toBe('discord')
  })

  it('rejects empty, invalid JSON, and unknown shapes', () => {
    expect(detectAndTransform('  ')).toMatchObject({ ok: false })
    expect(detectAndTransform('{not json')).toMatchObject({ ok: false, error: expect.stringMatching(/valid json/i) })
    expect(detectAndTransform('{"foo":1}')).toMatchObject({ ok: false, error: expect.stringMatching(/unrecognized/i) })
  })
})
