import { beforeEach, describe, expect, it, vi } from 'vitest'

const invokeMock = vi.fn()
vi.mock('@tauri-apps/api/core', () => ({ invoke: (...args: unknown[]) => invokeMock(...args) }))

import { downloadAssets, fetchAndDetect } from './fetchUrl'

beforeEach(() => {
  invokeMock.mockReset()
})

describe('downloadAssets', () => {
  it('returns [] without invoking when there are no urls', async () => {
    expect(await downloadAssets('/vault', 'Sources/_assets/x', [])).toEqual([])
    expect(invokeMock).not.toHaveBeenCalled()
  })

  it('passes vault/dest/urls through and returns saved names', async () => {
    invokeMock.mockResolvedValue(['a.png', ''])
    const out = await downloadAssets('/vault', 'Sources/_assets/x', ['https://x/a.png', 'https://x/b.png'])
    expect(out).toEqual(['a.png', ''])
    expect(invokeMock).toHaveBeenCalledWith('ingest_download_assets', {
      vaultPath: '/vault',
      destDir: 'Sources/_assets/x',
      urls: ['https://x/a.png', 'https://x/b.png'],
    })
  })

  it('returns [] when the native command is unavailable', async () => {
    invokeMock.mockRejectedValue(new Error('no native'))
    expect(await downloadAssets('/vault', 'd', ['https://x/a.png'])).toEqual([])
  })
})

describe('fetchAndDetect', () => {
  it('rejects a non-http URL without fetching', async () => {
    const result = await fetchAndDetect('not-a-url')
    expect(result).toMatchObject({ ok: false })
    expect(invokeMock).not.toHaveBeenCalled()
  })

  it('fetches the normalized URL and transforms the body', async () => {
    invokeMock.mockResolvedValue('<html><body><h1>Hello</h1><p>hi</p></body></html>')
    const result = await fetchAndDetect('https://example.com/post')
    expect(result.ok && result.note.source).toBe('web')
    expect(result.ok && result.note.title).toBe('Hello')
    expect(invokeMock).toHaveBeenCalledWith('ingest_fetch', { url: 'https://example.com/post' })
  })

  it('appends .json for a Reddit thread URL before fetching', async () => {
    invokeMock.mockResolvedValue(JSON.stringify([
      { data: { children: [{ kind: 't3', data: { title: 'T', author: 'a', subreddit: 'x', permalink: '/p' } }] } },
      { data: { children: [] } },
    ]))
    const result = await fetchAndDetect('https://www.reddit.com/r/x/comments/abc/t/')
    expect(result.ok && result.note.source).toBe('reddit')
    expect(invokeMock).toHaveBeenCalledWith('ingest_fetch', { url: 'https://www.reddit.com/r/x/comments/abc/t.json' })
  })

  it('surfaces a fetch failure as an error result', async () => {
    invokeMock.mockRejectedValue('boom')
    const result = await fetchAndDetect('https://example.com/x')
    expect(result).toMatchObject({ ok: false })
    expect(result.ok === false && result.error).toMatch(/could not fetch/i)
  })
})
