import { describe, expect, it } from 'vitest'
import type { VaultOption } from '../components/status-bar/types'
import { canMoveVaultPath, moveVaultPath, orderVaultsByPath, reorderVaultPath, vaultPathList } from './vaultOrdering'

const vaults: VaultOption[] = [
  { label: 'Grover', path: '/grover' },
  { label: 'Research', path: '/research' },
  { label: 'Archive', path: '/archive' },
]

describe('vaultOrdering', () => {
  it('extracts vault paths in display order', () => {
    expect(vaultPathList(vaults)).toEqual(['/grover', '/research', '/archive'])
  })

  it('orders vaults by a complete path list', () => {
    expect(orderVaultsByPath(vaults, ['/archive', '/grover', '/research'])).toEqual([
      vaults[2],
      vaults[0],
      vaults[1],
    ])
  })

  it('rejects incomplete or unknown path lists', () => {
    expect(orderVaultsByPath(vaults, ['/archive', '/grover'])).toBeNull()
    expect(orderVaultsByPath(vaults, ['/archive', '/grover', '/missing'])).toBeNull()
  })

  it('moves vault paths one slot at a time', () => {
    expect(moveVaultPath(vaults, '/research', 'up')).toEqual(['/research', '/grover', '/archive'])
    expect(moveVaultPath(vaults, '/research', 'down')).toEqual(['/grover', '/archive', '/research'])
  })

  it('reorders a dragged vault path to the hovered path index', () => {
    expect(reorderVaultPath(vaults, '/grover', '/archive')).toEqual(['/research', '/archive', '/grover'])
    expect(reorderVaultPath(vaults, '/archive', '/grover')).toEqual(['/archive', '/grover', '/research'])
  })

  it('ignores no-op or unknown drag reorder paths', () => {
    expect(reorderVaultPath(vaults, '/research', '/research')).toBeNull()
    expect(reorderVaultPath(vaults, '/missing', '/archive')).toBeNull()
    expect(reorderVaultPath(vaults, '/archive', '/missing')).toBeNull()
  })

  it('reports whether a vault can move in a direction', () => {
    expect(canMoveVaultPath(vaults, '/grover', 'up')).toBe(false)
    expect(canMoveVaultPath(vaults, '/grover', 'down')).toBe(true)
    expect(canMoveVaultPath(vaults, '/archive', 'down')).toBe(false)
  })
})
