import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { QueryBlockView } from './QueryBlockView'
import type { VaultEntry } from '../types'

function entry(partial: Partial<VaultEntry> & { path: string }): VaultEntry {
  return {
    filename: partial.path.split('/').pop() ?? '', title: '', isA: null, aliases: [], belongsTo: [],
    relatedTo: [], status: null, archived: false, modifiedAt: null, createdAt: null, fileSize: 0,
    snippet: '', wordCount: 0, relationships: {}, icon: null, color: null, order: null,
    sidebarLabel: null, template: null, sort: null, view: null, visible: null, outgoingLinks: [], properties: {},
    ...partial,
  } as VaultEntry
}

const entries = [
  entry({ path: '/v/a.md', title: 'Alpha', isA: 'Project', status: 'Active' }),
  entry({ path: '/v/b.md', title: 'Beta', isA: 'Project', status: 'Done' }),
  entry({ path: '/v/c.md', title: 'Carol', isA: 'Person', status: 'Active' }),
]

describe('QueryBlockView', () => {
  it('renders a table of matching notes with the requested fields', () => {
    render(<QueryBlockView source={'from: Project\nfields: title, status'} entries={entries} onOpenNote={vi.fn()} />)
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
    expect(screen.queryByText('Carol')).not.toBeInTheDocument()
  })

  it('opens a note when its title is clicked', () => {
    const onOpenNote = vi.fn()
    render(<QueryBlockView source="from: Project" entries={entries} onOpenNote={onOpenNote} />)
    fireEvent.click(screen.getByRole('button', { name: 'Alpha' }))
    expect(onOpenNote).toHaveBeenCalledWith('/v/a.md')
  })

  it('renders a list when as: list', () => {
    render(<QueryBlockView source={'from: Person\nas: list'} entries={entries} onOpenNote={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Carol' })).toBeInTheDocument()
  })

  it('shows an empty state when nothing matches', () => {
    render(<QueryBlockView source="from: Recipe" entries={entries} onOpenNote={vi.fn()} />)
    expect(screen.getByText(/no matching notes/i)).toBeInTheDocument()
  })

  it('surfaces parse errors', () => {
    render(<QueryBlockView source="bogus line" entries={entries} onOpenNote={vi.fn()} />)
    expect(screen.getByText(/ignored line/i)).toBeInTheDocument()
  })

  it('renders grouped sections with per-group counts when group is set', () => {
    render(<QueryBlockView source={'from: Project\ngroup: status\nfields: title'} entries={entries} onOpenNote={vi.fn()} />)
    // group headers (status is no longer a column, so these are unique)
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Done')).toBeInTheDocument()
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
  })
})
