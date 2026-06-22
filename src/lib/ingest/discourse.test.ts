import { describe, expect, it } from 'vitest'
import { discourseToSourceNote } from './discourse'

const topic = {
  title: 'Best PKM workflow?',
  slug: 'best-pkm-workflow',
  id: 42,
  post_stream: {
    posts: [
      { username: 'alice', post_number: 1, cooked: '<p>I use <strong>types</strong>.</p>' },
      { username: 'bob', post_number: 2, cooked: '<p>See <a href="https://x.com">this</a></p>' },
    ],
  },
}

describe('discourseToSourceNote', () => {
  it('renders each post (cooked HTML → markdown) with author', () => {
    const note = discourseToSourceNote(topic, 'https://forum.example.com')
    expect(note.source).toBe('discourse')
    expect(note.title).toBe('Best PKM workflow?')
    expect(note.author).toBe('alice')
    expect(note.url).toBe('https://forum.example.com/t/best-pkm-workflow/42')
    expect(note.body).toContain('**alice** · #1')
    expect(note.body).toContain('I use **types**.')
    expect(note.body).toContain('[this](https://x.com)')
  })

  it('handles a missing post stream', () => {
    expect(discourseToSourceNote({}).title).toBe('Forum topic')
  })
})
