import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ImportSourceDialog } from './ImportSourceDialog'
import type { DetectResult } from '../lib/ingest'

const fetchAndDetectMock = vi.fn<(url: string) => Promise<DetectResult>>()
vi.mock('../lib/ingest/fetchUrl', () => ({
  fetchAndDetect: (url: string) => fetchAndDetectMock(url),
}))

const REDDIT_JSON = JSON.stringify([
  { data: { children: [{ kind: 't3', data: { title: 'Pasted thread', author: 'a', subreddit: 'pkm', permalink: '/p' } }] } },
  { data: { children: [] } },
])

beforeEach(() => {
  fetchAndDetectMock.mockReset()
})

describe('ImportSourceDialog', () => {
  it('renders nothing when closed', () => {
    render(<ImportSourceDialog open={false} onImport={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.queryByTestId('import-source-dialog')).not.toBeInTheDocument()
  })

  it('previews and imports a pasted Reddit thread', async () => {
    const onImport = vi.fn()
    render(<ImportSourceDialog open onImport={onImport} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText(/Paste a Reddit/i), { target: { value: REDDIT_JSON } })

    expect(await screen.findByText('Pasted thread')).toBeInTheDocument()
    expect(screen.getByText('Reddit Thread')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Import note'))
    expect(onImport).toHaveBeenCalledTimes(1)
    expect(onImport.mock.calls[0][0]).toMatchObject({ source: 'reddit', title: 'Pasted thread' })
  })

  it('shows an error for invalid pasted content and disables import', () => {
    render(<ImportSourceDialog open onImport={vi.fn()} onCancel={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText(/Paste a Reddit/i), { target: { value: 'not json or html' } })
    expect(screen.getByText(/isn.t valid JSON or HTML/i)).toBeInTheDocument()
    expect(screen.getByText('Import note')).toBeDisabled()
  })

  it('fetches a URL and previews the result', async () => {
    fetchAndDetectMock.mockResolvedValue({
      ok: true,
      note: { title: 'Fetched article', source: 'web', url: '', author: null, body: 'body', assets: [] },
    })
    render(<ImportSourceDialog open onImport={vi.fn()} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText(/reddit\.com/i), { target: { value: 'https://example.com/post' } })
    fireEvent.click(screen.getByText('Fetch'))

    expect(await screen.findByText('Fetched article')).toBeInTheDocument()
    expect(fetchAndDetectMock).toHaveBeenCalledWith('https://example.com/post')
  })

  it('surfaces a fetch error', async () => {
    fetchAndDetectMock.mockResolvedValue({ ok: false, code: 'fetch-failed', detail: 'boom' })
    render(<ImportSourceDialog open onImport={vi.fn()} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText(/reddit\.com/i), { target: { value: 'https://example.com/x' } })
    fireEvent.click(screen.getByText('Fetch'))

    expect(await screen.findByText(/Could not fetch the URL/i)).toBeInTheDocument()
  })

  it('renders localized copy and drops the English plural suffix', async () => {
    render(<ImportSourceDialog open locale="de-DE" onImport={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText('Quelle importieren')).toBeInTheDocument()
    expect(screen.getByText('Abrufen')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText(/Reddit-Threads/i), { target: { value: REDDIT_JSON } })
    // German template is "{count} Dateien{plural}" — {plural} must resolve to ''.
    const summary = await screen.findByText(/Dateien/)
    expect(summary.textContent).not.toMatch(/\{plural\}|Dateiens/)
  })

  it('calls onCancel from the Cancel button', () => {
    const onCancel = vi.fn()
    render(<ImportSourceDialog open onImport={vi.fn()} onCancel={onCancel} />)
    fireEvent.click(screen.getByText('Cancel'))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
