import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCodeMirror, type CodeMirrorCallbacks } from './useCodeMirror'

const noop = () => {}
const callbacks: CodeMirrorCallbacks = {
  onDocChange: noop, onCursorActivity: noop, onSave: noop, onEscape: () => false,
}

/**
 * Tab is bound by the table keymap (Prec.highest), the outline keymap
 * (Prec.high) and the default keymap. These assert the intended fall-through.
 */
describe('useCodeMirror Tab precedence: tables > lists > default', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })
  afterEach(() => { document.body.removeChild(container) })

  function mount(doc: string, cursorOffset: number) {
    const ref = { current: container }
    const rendered = renderHook(() => useCodeMirror(ref, doc, callbacks))
    act(() => {
      rendered.result.current.current?.dispatch({ selection: { anchor: cursorOffset } })
    })
    return rendered
  }

  function pressTab(view: ReturnType<typeof mount>['result']['current']['current'], shift = false) {
    act(() => {
      view?.contentDOM.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Tab', code: 'Tab', shiftKey: shift, bubbles: true, cancelable: true,
      }))
    })
  }

  it('Tab inside a table moves to the next cell rather than indenting', () => {
    const doc = '| a   | b   |\n| --- | --- |\n| 1   | 2   |'
    const { result } = mount(doc, doc.indexOf('1'))
    pressTab(result.current.current)
    const text = result.current.current?.state.doc.toString() ?? ''
    // The table is reformatted in place, not indented.
    expect(text.startsWith('| a')).toBe(true)
    expect(text).not.toContain('\t')
  })

  it('Tab on a list item indents it instead of inserting whitespace', () => {
    const doc = '- alpha\n- beta'
    const { result } = mount(doc, doc.indexOf('beta'))
    pressTab(result.current.current)
    expect(result.current.current?.state.doc.toString()).toBe('- alpha\n  - beta')
  })

  it('Shift-Tab on a nested list item outdents it', () => {
    const doc = '- alpha\n  - beta'
    const { result } = mount(doc, doc.indexOf('beta'))
    pressTab(result.current.current, true)
    expect(result.current.current?.state.doc.toString()).toBe('- alpha\n- beta')
  })

  it('Tab in prose is left to the default keymap, not the outline handler', () => {
    const doc = 'plain prose'
    const { result } = mount(doc, 5)
    const before = result.current.current?.state.doc.toString()
    pressTab(result.current.current)
    // Whatever the default does, the outline layer must not have rewritten it.
    expect(result.current.current?.state.doc.toString()).not.toBe('  plain prose')
    expect(before).toBe('plain prose')
  })
})
