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

  function imagePost(data: Record<string, unknown>) {
    return [{ data: { children: [{ kind: 't3', data: { title: 'Pic', ...data } }] } }, { data: { children: [] } }]
  }

  it('embeds a direct image post and records it as an asset', () => {
    const note = redditThreadToSourceNote(imagePost({ url: 'https://i.redd.it/x.jpg' }))
    expect(note.body).toContain('![](https://i.redd.it/x.jpg)')
    expect(note.assets).toEqual(['https://i.redd.it/x.jpg'])
  })

  it('embeds every image in a gallery via media_metadata, unescaping &amp;', () => {
    const note = redditThreadToSourceNote(imagePost({
      is_gallery: true,
      gallery_data: { items: [{ media_id: 'a1' }, { media_id: 'b2' }] },
      media_metadata: {
        a1: { s: { u: 'https://preview.redd.it/a1.jpg?width=1&amp;s=z' } },
        b2: { s: { u: 'https://preview.redd.it/b2.png' } },
      },
    }))
    expect(note.body).toContain('![](https://preview.redd.it/a1.jpg?width=1&s=z)')
    expect(note.body).toContain('![](https://preview.redd.it/b2.png)')
    expect(note.assets).toEqual([
      'https://preview.redd.it/a1.jpg?width=1&s=z',
      'https://preview.redd.it/b2.png',
    ])
  })

  it('falls back to the preview image when there is no direct or gallery image', () => {
    const note = redditThreadToSourceNote(imagePost({
      url: 'https://www.reddit.com/r/x/comments/y/pic/',
      preview: { images: [{ source: { url: 'https://preview.redd.it/p.jpg?s=a&amp;b=c' } }] },
    }))
    expect(note.assets).toEqual(['https://preview.redd.it/p.jpg?s=a&b=c'])
  })

  it('does not embed a non-image post url', () => {
    const note = redditThreadToSourceNote(imagePost({ url: 'https://example.com/article' }))
    expect(note.assets).toEqual([])
    expect(note.body).not.toContain('![](')
  })
})
