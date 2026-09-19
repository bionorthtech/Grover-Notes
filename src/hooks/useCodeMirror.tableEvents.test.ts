import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCodeMirror, type CodeMirrorCallbacks } from './useCodeMirror'
import { requestMarkdownTableEdit } from '../components/markdownTableEvents'
import { requestMarkdownOutlineEdit } from '../components/markdownOutlineEvents'

const noop = () => {}
const callbacks: CodeMirrorCallbacks = {
  onDocChange: noop,
  onCursorActivity: noop,
  onSave: noop,
  onEscape: () => false,
}

const RAGGED = '|a|b|\n|---|---|\n|1|2|'

describe('useCodeMirror markdown table events', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
  })

  function mount(doc: string) {
    const ref = { current: container }
    return renderHook(() => useCodeMirror(ref, doc, callbacks))
  }

  it('formats the table when a format request is dispatched', () => {
    const { result } = mount(RAGGED)
    act(() => { requestMarkdownTableEdit({ format: true }) })
    expect(result.current.current?.state.doc.toString())
      .toBe('| a   | b   |\n| --- | --- |\n| 1   | 2   |')
  })

  it('applies a structural edit from the palette', () => {
    const { result } = mount(RAGGED)
    act(() => { requestMarkdownTableEdit({ edit: { kind: 'insert-column-right' } }) })
    const doc = result.current.current?.state.doc.toString() ?? ''
    expect(doc.split('\n')[0]).toBe('| a   |     | b   |')
  })

  it('ignores table requests when the cursor is not in a table', () => {
    const { result } = mount('plain prose')
    act(() => { requestMarkdownTableEdit({ format: true }) })
    expect(result.current.current?.state.doc.toString()).toBe('plain prose')
  })

  it('stops listening once the editor unmounts', () => {
    const { result, unmount } = mount(RAGGED)
    const view = result.current.current
    unmount()
    // Dispatching after teardown must not touch the destroyed view.
    expect(() => { requestMarkdownTableEdit({ format: true }) }).not.toThrow()
    expect(view?.state.doc.toString()).toBe(RAGGED)
  })
})

describe('useCodeMirror markdown outline events', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })
  afterEach(() => { document.body.removeChild(container) })

  function mountOutline(doc: string) {
    const ref = { current: container }
    return renderHook(() => useCodeMirror(ref, doc, callbacks))
  }

  it('indents the item under the cursor from a palette request', () => {
    const { result } = mountOutline('- alpha\n- beta')
    act(() => {
      result.current.current?.dispatch({ selection: { anchor: '- alpha\n- beta'.indexOf('beta') } })
    })
    act(() => { requestMarkdownOutlineEdit('indent') })
    expect(result.current.current?.state.doc.toString()).toBe('- alpha\n  - beta')
  })

  it('ignores outline requests when the cursor is not on a list item', () => {
    const { result } = mountOutline('plain prose')
    act(() => { requestMarkdownOutlineEdit('outdent') })
    expect(result.current.current?.state.doc.toString()).toBe('plain prose')
  })

  it('stops listening once the editor unmounts', () => {
    const { result, unmount } = mountOutline('- a\n- b')
    const view = result.current.current
    unmount()
    expect(() => { requestMarkdownOutlineEdit('indent') }).not.toThrow()
    expect(view?.state.doc.toString()).toBe('- a\n- b')
  })
})
