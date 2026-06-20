import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { QueryDialog } from './QueryDialog'
import type { SavedQuery, VaultEntry } from '../types'

function entry(partial: Partial<VaultEntry> & { path: string }): VaultEntry {
  return {
    filename: partial.path.split('/').pop() ?? '', title: '', isA: 'Project', aliases: [], belongsTo: [],
    relatedTo: [], status: null, archived: false, modifiedAt: null, createdAt: null, fileSize: 0,
    snippet: '', wordCount: 0, relationships: {}, icon: null, color: null, order: null,
    sidebarLabel: null, template: null, sort: null, view: null, visible: null, outgoingLinks: [], properties: {},
    ...partial,
  } as VaultEntry
}

const saved: SavedQuery[] = [{ name: 'Active projects', source: 'from: Project' }]

function setup(savedQueries: SavedQuery[] = []) {
  const onSaveQuery = vi.fn()
  const onDeleteQuery = vi.fn()
  render(
    <QueryDialog
      open
      entries={[entry({ path: '/v/a.md', title: 'Alpha' })]}
      savedQueries={savedQueries}
      onSaveQuery={onSaveQuery}
      onDeleteQuery={onDeleteQuery}
      onOpenNote={vi.fn()}
      onClose={vi.fn()}
    />,
  )
  return { onSaveQuery, onDeleteQuery }
}

describe('QueryDialog', () => {
  it('saves the current query under a typed name', () => {
    const { onSaveQuery } = setup()
    fireEvent.change(screen.getByPlaceholderText(/save this query/i), { target: { value: 'My query' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSaveQuery).toHaveBeenCalledWith('My query', expect.stringContaining('from:'))
  })

  it('does not save an empty name', () => {
    const { onSaveQuery } = setup()
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    expect(onSaveQuery).not.toHaveBeenCalled()
  })

  it('lists saved queries and deletes one', () => {
    const { onDeleteQuery } = setup(saved)
    expect(screen.getByRole('button', { name: 'Active projects' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /delete active projects/i }))
    expect(onDeleteQuery).toHaveBeenCalledWith('Active projects')
  })
})
