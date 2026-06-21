import type { QueryOperator } from './queryBlocks'

/**
 * Visual query builder: turns structured form state into `grover-query` DSL
 * source. Pure + synchronous so it's fully testable; the builder UI calls this
 * on every change and feeds the result to the live query view.
 */

export interface BuilderCondition {
  field: string
  operator: QueryOperator
  value: string
}

export interface QueryBuilderState {
  from: string
  conditions: BuilderCondition[]
  sortField: string
  sortDirection: 'asc' | 'desc'
  groupBy: string
  limit: string
  render: 'table' | 'list'
  fields: string
}

export const BUILDER_OPERATORS: QueryOperator[] = ['=', '!=', 'contains', '>', '<', 'in', 'exists', 'empty']

export const EMPTY_BUILDER: QueryBuilderState = {
  from: '',
  conditions: [],
  sortField: '',
  sortDirection: 'desc',
  groupBy: '',
  limit: '',
  render: 'table',
  fields: '',
}

function isUnary(operator: QueryOperator): boolean {
  return operator === 'exists' || operator === 'empty'
}

function conditionToString(condition: BuilderCondition): string | null {
  const field = condition.field.trim()
  if (!field) return null
  if (isUnary(condition.operator)) return `${field} ${condition.operator}`
  const value = condition.value.trim()
  if (!value) return null
  return `${field} ${condition.operator} ${value}`
}

/** Emits DSL source from builder state, omitting empty/default clauses. */
export function buildQuerySource(state: QueryBuilderState): string {
  const lines: string[] = []
  if (state.from.trim()) lines.push(`from: ${state.from.trim()}`)

  const where = state.conditions.map(conditionToString).filter((value): value is string => value !== null)
  if (where.length > 0) lines.push(`where: ${where.join(' and ')}`)

  if (state.sortField.trim()) lines.push(`sort: ${state.sortField.trim()} ${state.sortDirection}`)
  if (state.groupBy.trim()) lines.push(`group: ${state.groupBy.trim()}`)

  const limit = Number(state.limit)
  if (Number.isFinite(limit) && limit > 0) lines.push(`limit: ${Math.floor(limit)}`)

  if (state.render === 'list') lines.push('as: list')
  if (state.fields.trim()) lines.push(`fields: ${state.fields.trim()}`)

  return lines.join('\n')
}
