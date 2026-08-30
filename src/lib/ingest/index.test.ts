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

  it('detects a Discourse topic', () => {
    const result = detectAndTransform(JSON.stringify({ title: 'T', post_stream: { posts: [{ username: 'a', cooked: '<p>hi</p>' }] } }))
    expect(result.ok && result.note.source).toBe('discourse')
  })

  it('treats pasted HTML as a web clip', () => {
    const result = detectAndTransform('<html><body><h1>Title</h1><p>body</p></body></html>')
    expect(result.ok && result.note.source).toBe('web')
    expect(result.ok && result.note.title).toBe('Title')
  })

  it('rejects empty, non-JSON-non-HTML, and unknown JSON shapes', () => {
    expect(detectAndTransform('  ')).toMatchObject({ ok: false })
    expect(detectAndTransform('not json or html')).toMatchObject({ ok: false, code: 'not-json-or-html' })
    expect(detectAndTransform('{"foo":1}')).toMatchObject({ ok: false, code: 'unrecognized' })
  })
})
