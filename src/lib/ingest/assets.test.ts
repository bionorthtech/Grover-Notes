import { describe, expect, it } from 'vitest'
import { rewriteAssetUrls } from './assets'

describe('rewriteAssetUrls', () => {
  it('replaces each downloaded asset URL with its local path', () => {
    const body = '![](https://i.redd.it/a.png)\ntext\n![](https://i.redd.it/b.jpg)'
    const out = rewriteAssetUrls(
      body,
      ['https://i.redd.it/a.png', 'https://i.redd.it/b.jpg'],
      ['a.png', 'b.jpg'],
      'Sources/_assets/thread',
    )
    expect(out).toContain('![](Sources/_assets/thread/a.png)')
    expect(out).toContain('![](Sources/_assets/thread/b.jpg)')
    expect(out).not.toContain('i.redd.it')
  })

  it('keeps the remote URL for assets that failed to download', () => {
    const body = '![](https://x/a.png) ![](https://x/b.png)'
    const out = rewriteAssetUrls(body, ['https://x/a.png', 'https://x/b.png'], ['a.png'], 'd')
    expect(out).toBe('![](d/a.png) ![](https://x/b.png)')
  })

  it('replaces every occurrence of a repeated URL', () => {
    const out = rewriteAssetUrls('https://x/a.png and https://x/a.png', ['https://x/a.png'], ['a.png'], 'd')
    expect(out).toBe('d/a.png and d/a.png')
  })

  it('trims trailing slashes from the asset dir', () => {
    const out = rewriteAssetUrls('https://x/a.png', ['https://x/a.png'], ['a.png'], 'd/')
    expect(out).toBe('d/a.png')
  })

  it('returns the body unchanged when there are no assets', () => {
    expect(rewriteAssetUrls('body', [], [], 'd')).toBe('body')
  })
})
