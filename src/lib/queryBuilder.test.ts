import { describe, expect, it } from 'vitest'
import { buildQuerySource, EMPTY_BUILDER, type QueryBuilderState } from './queryBuilder'
import { parseQuery } from './queryBlocks'

function state(over: Partial<QueryBuilderState>): QueryBuilderState {
  return { ...EMPTY_BUILDER, ...over }
}

describe('buildQuerySource', () => {
  it('emits a full query and round-trips through parseQuery', () => {
    const source = buildQuerySource(state({
      from: 'Project',
      conditions: [{ field: 'status', operator: '=', value: 'Active' }],
      sortField: 'modified',
      sortDirection: 'desc',
      groupBy: 'status',
      limit: '10',
      render: 'list',
      fields: 'title, status',
    }))
    expect(source).toBe([
      'from: Project',
      'where: status = Active',
      'sort: modified desc',
      'group: status',
      'limit: 10',
      'as: list',
      'fields: title, status',
    ].join('\n'))
    const parsed = parseQuery(source)
    expect(parsed).toMatchObject({ from: 'Project', sortField: 'modified', groupBy: 'status', limit: 10, render: 'list' })
    expect(parsed.errors).toEqual([])
  })

  it('omits empty clauses and incomplete conditions', () => {
    expect(buildQuerySource(EMPTY_BUILDER)).toBe('')
    expect(buildQuerySource(state({
      from: 'Note',
      conditions: [{ field: '', operator: '=', value: 'x' }, { field: 'owner', operator: '=', value: '' }],
    }))).toBe('from: Note')
  })

  it('handles unary operators without a value', () => {
    expect(buildQuerySource(state({ conditions: [{ field: 'owner', operator: 'empty', value: 'ignored' }] })))
      .toBe('where: owner empty')
  })

  it('joins multiple conditions with and', () => {
    const source = buildQuerySource(state({
      conditions: [
        { field: 'status', operator: '=', value: 'Active' },
        { field: 'owner', operator: 'contains', value: 'Luca' },
      ],
    }))
    expect(source).toBe('where: status = Active and owner contains Luca')
  })

  it('drops a non-positive limit', () => {
    expect(buildQuerySource(state({ from: 'Note', limit: '0' }))).toBe('from: Note')
  })
})
