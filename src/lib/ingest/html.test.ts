import { describe, expect, it } from 'vitest'
import { htmlToMarkdown } from './html'

describe('htmlToMarkdown', () => {
  it('converts headings, paragraphs, and inline emphasis', () => {
    const { markdown } = htmlToMarkdown('<h2>Title</h2><p>Hello <strong>bold</strong> and <em>italic</em>.</p>')
    expect(markdown).toContain('## Title')
    expect(markdown).toContain('Hello **bold** and *italic*.')
  })

  it('converts links, lists, code, and blockquotes', () => {
    const { markdown } = htmlToMarkdown(
      '<p>See <a href="https://x.com">site</a></p><ul><li>one</li><li>two</li></ul><blockquote>quoted</blockquote><code>x()</code>',
    )
    expect(markdown).toContain('[site](https://x.com)')
    expect(markdown).toContain('- one')
    expect(markdown).toContain('- two')
    expect(markdown).toContain('> quoted')
    expect(markdown).toContain('`x()`')
  })

  it('extracts images as markdown and collects their URLs', () => {
    const { markdown, assets } = htmlToMarkdown('<p>pic <img src="https://cdn/a.png" alt="A"></p>')
    expect(markdown).toContain('![A](https://cdn/a.png)')
    expect(assets).toEqual(['https://cdn/a.png'])
  })

  it('numbers ordered lists', () => {
    const { markdown } = htmlToMarkdown('<ol><li>first</li><li>second</li></ol>')
    expect(markdown).toContain('1. first')
    expect(markdown).toContain('2. second')
  })

  it('drops script and style content instead of leaking source as text', () => {
    const { markdown } = htmlToMarkdown(
      '<p>Real text</p><script>var leak = 1;</script><style>.x{color:red}</style>',
    )
    expect(markdown).toContain('Real text')
    expect(markdown).not.toContain('leak')
    expect(markdown).not.toContain('color:red')
  })
})
