import { describe, expect, it } from 'vitest'
import { evaluateQuery, fieldValue, parseQuery } from './queryBlocks'
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

describe('parseQuery', () => {
  it('parses a full query', () => {
    const q = parseQuery([
      'from: Project',
      'where: status = Active and owner contains Luca',
      'sort: modified desc',
      'limit: 5',
      'as: list',
      'fields: title, status',
    ].join('\n'))
    expect(q.from).toBe('Project')
    expect(q.conditions).toEqual([
      { field: 'status', operator: '=', value: 'Active' },
      { field: 'owner', operator: 'contains', value: 'Luca' },
    ])
    expect(q).toMatchObject({ sortField: 'modified', sortDirection: 'desc', limit: 5, render: 'list', fields: ['title', 'status'] })
    expect(q.errors).toEqual([])
  })

  it('applies sensible defaults and records unknown clauses', () => {
    const q = parseQuery('wat: huh')
    expect(q).toMatchObject({ from: null, sortField: 'title', sortDirection: 'asc', limit: null, render: 'table' })
    expect(q.errors[0]).toMatch(/unknown clause/i)
  })

  it('treats from: any as no type filter and flags bad limits', () => {
    expect(parseQuery('from: any').from).toBeNull()
    expect(parseQuery('limit: -3').errors[0]).toMatch(/invalid limit/i)
  })
})

describe('fieldValue', () => {
  const e = entry({ path: '/v/a.md', title: 'A', isA: 'Project', status: 'Active', modifiedAt: 100, wordCount: 42, properties: { Owner: 'Luca' }, relationships: { belongs_to: ['[[Q1]]'] } })
  it('resolves built-in and dynamic fields', () => {
    expect(fieldValue(e, 'title')).toBe('A')
    expect(fieldValue(e, 'type')).toBe('Project')
    expect(fieldValue(e, 'modified')).toBe(100)
    expect(fieldValue(e, 'owner')).toBe('Luca')
    expect(fieldValue(e, 'belongs_to')).toBe('[[Q1]]')
    expect(fieldValue(e, 'nope')).toBeNull()
  })
})

describe('evaluateQuery', () => {
  const entries = [
    entry({ path: '/v/a.md', title: 'Alpha', isA: 'Project', status: 'Active', modifiedAt: 300 }),
    entry({ path: '/v/b.md', title: 'Beta', isA: 'Project', status: 'Done', modifiedAt: 200 }),
    entry({ path: '/v/c.md', title: 'Gamma', isA: 'Person', status: 'Active', modifiedAt: 100 }),
    entry({ path: '/v/t.md', title: 'TypeDef', isA: 'Type' }),
    entry({ path: '/v/x.md', title: 'Archived', isA: 'Project', archived: true }),
  ]

  it('filters by type and excludes Type defs + archived', () => {
    const result = evaluateQuery(parseQuery('from: Project'), entries)
    expect(result.map((e) => e.title)).toEqual(['Alpha', 'Beta']) // default sort by title asc
  })

  it('applies where conditions', () => {
    const result = evaluateQuery(parseQuery('where: status = Active'), entries)
    expect(result.map((e) => e.title).sort()).toEqual(['Alpha', 'Gamma'])
  })

  it('sorts and limits', () => {
    const result = evaluateQuery(parseQuery('from: Project\nsort: modified desc\nlimit: 1'), entries)
    expect(result.map((e) => e.title)).toEqual(['Alpha'])
  })

  it('supports numeric comparisons on dates', () => {
    const result = evaluateQuery(parseQuery('where: modified > 150'), entries)
    expect(result.map((e) => e.title).sort()).toEqual(['Alpha', 'Beta'])
  })

  it('resolves relative-date tokens like today', () => {
    const now = new Date(2026, 5, 16, 9, 0, 0)
    const todayStart = Math.floor(new Date(2026, 5, 16).getTime() / 1000)
    const dated = [
      entry({ path: '/v/today.md', title: 'Today', isA: 'Note', modifiedAt: todayStart + 3600 }),
      entry({ path: '/v/old.md', title: 'Old', isA: 'Note', modifiedAt: todayStart - 3600 }),
    ]
    const result = evaluateQuery(parseQuery('where: modified >= today'), dated, now)
    expect(result.map((e) => e.title)).toEqual(['Today'])
  })
})
