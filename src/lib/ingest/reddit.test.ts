import { describe, expect, it } from 'vitest'
import { redditThreadToSourceNote } from './reddit'

// Minimal but representative shape of a Reddit thread `.json` payload.
const payload = [
  {
    kind: 'Listing',
    data: { children: [{
      kind: 't3',
      data: {
        title: 'How do you organize notes?',
        author: 'alice', subreddit: 'PKM', subreddit_name_prefixed: 'r/PKM',
        permalink: '/r/PKM/comments/abc/how_do_you/', score: 42,
        selftext: 'I use **types** and links.',
        url: 'https://www.reddit.com/r/PKM/comments/abc/how_do_you/',
      },
    }] },
  },
  {
    kind: 'Listing',
    data: { children: [
      { kind: 't1', data: {
        author: 'bob', score: 7, body: 'Daily notes work for me.',
        replies: { kind: 'Listing', data: { children: [
          { kind: 't1', data: { author: 'carol', score: 3, body: 'Same here.', replies: '' } },
        ] } },
      } },
      { kind: 'more', data: { count: 5, children: ['x1', 'x2'] } }, // ignored
    ] },
  },
]

describe('redditThreadToSourceNote', () => {
  it('extracts the post, metadata, and selftext', () => {
    const note = redditThreadToSourceNote(payload)
    expect(note.source).toBe('reddit')
    expect(note.title).toBe('How do you organize notes?')
    expect(note.author).toBe('alice')
    expect(note.url).toBe('https://www.reddit.com/r/PKM/comments/abc/how_do_you/')
    expect(note.body).toContain('*r/PKM · by u/alice · 42 points*')
    expect(note.body).toContain('I use **types** and links.')
  })

  it('renders the comment tree with nesting and scores', () => {
    const body = redditThreadToSourceNote(payload).body
    expect(body).toContain('- **u/bob** · 7 points')
    expect(body).toContain('  Daily notes work for me.')
    expect(body).toContain('  - **u/carol** · 3 points') // nested one level
    expect(body).not.toContain('x1') // `more` node skipped
  })

  it('handles an empty / malformed payload without throwing', () => {
    expect(redditThreadToSourceNote(null).title).toBe('Reddit thread')
    expect(redditThreadToSourceNote([]).body).toContain('## Comments')
  })
})
