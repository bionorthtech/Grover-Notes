import { describe, expect, it } from 'vitest'
import { webClipToSourceNote } from './web'

describe('webClipToSourceNote', () => {
  it('prefers <article> content and strips nav/header/footer chrome', () => {
    const note = webClipToSourceNote(`
      <html><head><title>My Article</title></head><body>
        <header><nav><a href="/">Home</a></nav></header>
        <article><h1>Heading</h1><p>The real content.</p></article>
        <footer>© 2026 Site</footer>
      </body></html>`)
    expect(note.source).toBe('web')
    expect(note.title).toBe('My Article')
    expect(note.body).toContain('The real content.')
    expect(note.body).not.toContain('Home')
    expect(note.body).not.toContain('© 2026 Site')
  })

  it('falls back to <main>, then the body, when there is no <article>', () => {
    const note = webClipToSourceNote('<main><p>Main content</p></main>')
    expect(note.body).toContain('Main content')
  })

  it('derives a title from <h1> when <title> is absent', () => {
    const note = webClipToSourceNote('<body><h1>Just an H1</h1><p>x</p></body>')
    expect(note.title).toBe('Just an H1')
  })

  it('falls back to a default title', () => {
    expect(webClipToSourceNote('<p>no title here</p>').title).toBe('Web clip')
  })
})
