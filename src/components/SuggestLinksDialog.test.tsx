import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { SuggestLinksDialog } from './SuggestLinksDialog'
import type { UnlinkedMention } from '../utils/unlinkedMentions'

const mentions: UnlinkedMention[] = [
  { path: '/v/alice.md', displayName: 'Alice', matchedText: 'Alice', index: 0 },
  { path: '/v/bob.md', displayName: 'Bob', matchedText: 'Bob', index: 10 },
]

function renderDialog(overrides: Partial<Parameters<typeof SuggestLinksDialog>[0]> = {}) {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()
  render(
    <SuggestLinksDialog
      open
      noteTitle="My Note"
      mentions={mentions}
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...overrides}
    />,
  )
  return { onConfirm, onCancel }
}

describe('SuggestLinksDialog', () => {
  it('lists every mention with its matched text', () => {
    renderDialog()
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText(/2 unlinked mentions found/i)).toBeInTheDocument()
  })

  it('confirms all mentions selected by default', () => {
    const { onConfirm } = renderDialog()
    fireEvent.click(screen.getByRole('button', { name: /add 2 links/i }))
    expect(onConfirm).toHaveBeenCalledWith(expect.arrayContaining(['/v/alice.md', '/v/bob.md']))
  })

  it('deselecting a mention excludes it from the result', () => {
    const { onConfirm } = renderDialog()
    fireEvent.click(screen.getByLabelText('Alice'))
    fireEvent.click(screen.getByRole('button', { name: /add 1 link/i }))
    expect(onConfirm).toHaveBeenCalledWith(['/v/bob.md'])
  })

  it('cancels without confirming', () => {
    const { onConfirm, onCancel } = renderDialog()
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onCancel).toHaveBeenCalled()
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
