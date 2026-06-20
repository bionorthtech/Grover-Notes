import type { VaultEntry } from '../types'

/**
 * Query blocks: a tiny, dependency-free query language for embedding live note
 * tables/lists inside notes. A fenced ```grover-query block is parsed here into a
 * GroverQuery and evaluated against the vault entries. Pure + synchronous so it's
 * fully testable and cheap to re-run on every vault change.
 *
 * Example:
 *   from: Project
 *   where: status = Active and owner contains Luca
 *   sort: modified desc
 *   limit: 10
 *   as: table
 *   fields: title, status, owner
 */

export type QueryOperator = '=' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'in' | 'exists' | 'empty'
export type QueryRender = 'table' | 'list'
export type SortDirection = 'asc' | 'desc'

export interface QueryCondition {
  field: string
  operator: QueryOperator
  value: string
}

export interface GroverQuery {
  /** Type (isA) to match, or null for "any type". */
  from: string | null
  conditions: QueryCondition[]
  sortField: string
  sortDirection: SortDirection
  limit: number | null
  render: QueryRender
  fields: string[]
  /** Field to group results by, or null for a flat list. */
  groupBy: string | null
  /** Non-fatal problems (unrecognised lines / conditions) for surfacing to the user. */
  errors: string[]
}

const OPERATORS: QueryOperator[] = ['>=', '<=', '!=', '=', '>', '<', 'contains']

const DEFAULT_QUERY: Omit<GroverQuery, 'errors'> = {
  from: null,
  conditions: [],
  sortField: 'title',
  sortDirection: 'asc',
  limit: null,
  render: 'table',
  fields: ['title', 'type', 'status'],
  groupBy: null,
}

function stripQuotes(value: string): string {
  const trimmed = value.trim()
  if (trimmed.length >= 2 && (trimmed[0] === '"' || trimmed[0] === "'") && trimmed[trimmed.length - 1] === trimmed[0]) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

const FIELD = '[\\p{L}\\p{N}_ .-]+?'

function parseCondition(raw: string, errors: string[]): QueryCondition | null {
  const text = raw.trim()
  if (!text) return null
  // Unary presence checks: "<field> exists" / "<field> empty".
  const unary = text.match(new RegExp(`^(${FIELD})\\s+(exists|empty)$`, 'iu'))
  if (unary) return { field: unary[1].trim().toLowerCase(), operator: unary[2].toLowerCase() as QueryOperator, value: '' }
  // Membership: "<field> in a, b, c".
  const inMatch = text.match(new RegExp(`^(${FIELD})\\s+in\\s+(.+)$`, 'iu'))
  if (inMatch) return { field: inMatch[1].trim().toLowerCase(), operator: 'in', value: inMatch[2].trim() }
  for (const operator of OPERATORS) {
    const token = operator === 'contains' ? ' contains ' : operator
    const index = text.indexOf(token)
    if (index > 0) {
      const field = text.slice(0, index).trim()
      const value = stripQuotes(text.slice(index + token.length))
      if (field) return { field: field.toLowerCase(), operator, value }
    }
  }
  errors.push(`Could not parse condition: "${text}"`)
  return null
}

function parseConditions(value: string, errors: string[]): QueryCondition[] {
  return value
    .split(/\s+and\s+/i)
    .map((part) => parseCondition(part, errors))
    .filter((condition): condition is QueryCondition => condition !== null)
}

function parseSort(value: string): { sortField: string; sortDirection: SortDirection } {
  const [field, direction] = value.trim().split(/\s+/)
  return {
    sortField: (field || 'title').toLowerCase(),
    sortDirection: direction?.toLowerCase() === 'desc' ? 'desc' : 'asc',
  }
}

function parseList(value: string): string[] {
  return value.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean)
}

/** Parses a grover-query block body into a structured query. */
export function parseQuery(source: string): GroverQuery {
  const errors: string[] = []
  const query: GroverQuery = { ...DEFAULT_QUERY, conditions: [], fields: [...DEFAULT_QUERY.fields], errors }
  for (const line of source.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const colon = trimmed.indexOf(':')
    if (colon === -1) { errors.push(`Ignored line: "${trimmed}"`); continue }
    const key = trimmed.slice(0, colon).trim().toLowerCase()
    const value = trimmed.slice(colon + 1).trim()
    applyClause(query, key, value, errors)
  }
  return query
}

function applyClause(query: GroverQuery, key: string, value: string, errors: string[]): void {
  switch (key) {
    case 'from': query.from = value && value.toLowerCase() !== 'any' ? value : null; break
    case 'where': query.conditions = parseConditions(value, errors); break
    case 'sort': Object.assign(query, parseSort(value)); break
    case 'limit': { const n = Number(value); if (Number.isFinite(n) && n > 0) query.limit = Math.floor(n); else errors.push(`Invalid limit: "${value}"`); break }
    case 'as': query.render = value.toLowerCase() === 'list' ? 'list' : 'table'; break
    case 'fields': { const fields = parseList(value); if (fields.length > 0) query.fields = fields; break }
    case 'group': case 'groupby': query.groupBy = value ? value.toLowerCase() : null; break
    default: errors.push(`Unknown clause: "${key}"`)
  }
}

/** Resolves a field name to a comparable value on an entry. */
export function fieldValue(entry: VaultEntry, field: string): string | number | null {
  switch (field) {
    case 'title': return entry.title
    case 'type': case 'is': case 'isa': return entry.isA
    case 'status': return entry.status
    case 'modified': case 'modifiedat': return entry.modifiedAt
    case 'created': case 'createdat': return entry.createdAt
    case 'words': case 'wordcount': return entry.wordCount
    case 'path': return entry.path
    default: return resolveDynamicField(entry, field)
  }
}

function resolveDynamicField(entry: VaultEntry, field: string): string | null {
  const propKey = Object.keys(entry.properties ?? {}).find((key) => key.toLowerCase() === field)
  if (propKey) return stringifyValue(entry.properties[propKey])
  const relKey = Object.keys(entry.relationships ?? {}).find((key) => key.toLowerCase() === field)
  if (relKey) return entry.relationships[relKey].join(', ')
  return null
}

function stringifyValue(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (Array.isArray(value)) return value.join(', ')
  return String(value)
}

function matches(entryValue: string | number | null, operator: QueryOperator, target: string): boolean {
  const isBlank = entryValue === null || entryValue === ''
  if (operator === 'exists') return !isBlank
  if (operator === 'empty') return isBlank
  if (entryValue === null) return operator === '!='
  if (operator === 'in') {
    const options = target.split(',').map((value) => value.trim().toLowerCase()).filter(Boolean)
    return options.includes(String(entryValue).toLowerCase())
  }
  const left = typeof entryValue === 'number' ? entryValue : entryValue.toLowerCase()
  const rightNum = Number(target)
  const right = typeof entryValue === 'number' && Number.isFinite(rightNum) ? rightNum : target.toLowerCase()
  switch (operator) {
    case '=': return left === right
    case '!=': return left !== right
    case 'contains': return String(left).includes(String(right))
    case '>': return left > right
    case '<': return left < right
    case '>=': return left >= right
    case '<=': return left <= right
    default: return false
  }
}

function compare(a: string | number | null, b: string | number | null): number {
  if (a === null && b === null) return 0
  if (a === null) return 1
  if (b === null) return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b))
}

const DATE_FIELDS = new Set(['modified', 'modifiedat', 'created', 'createdat'])

/** Resolves relative-date tokens (today/yesterday/now) to epoch-second strings
 *  for date-field comparisons; leaves other values untouched. */
export function resolveConditionValue(field: string, value: string, now: Date): string {
  if (!DATE_FIELDS.has(field)) return value
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000
  switch (value.trim().toLowerCase()) {
    case 'today': return String(Math.floor(startOfDay))
    case 'yesterday': return String(Math.floor(startOfDay - 86400))
    case 'now': return String(Math.floor(now.getTime() / 1000))
    default: return value
  }
}

/** Runs a parsed query against the vault entries (excludes Type defs + archived). */
export function evaluateQuery(query: GroverQuery, entries: VaultEntry[], now: Date = new Date()): VaultEntry[] {
  const fromKey = query.from?.toLowerCase() ?? null
  const resolvedConditions = query.conditions.map((condition) => ({
    ...condition,
    value: resolveConditionValue(condition.field, condition.value, now),
  }))
  const filtered = entries.filter((entry) => {
    if (entry.archived || entry.isA === 'Type') return false
    if (fromKey && (entry.isA ?? '').toLowerCase() !== fromKey) return false
    return resolvedConditions.every((condition) => matches(fieldValue(entry, condition.field), condition.operator, condition.value))
  })
  const sorted = filtered.sort((a, b) => {
    const result = compare(fieldValue(a, query.sortField), fieldValue(b, query.sortField))
    return query.sortDirection === 'desc' ? -result : result
  })
  return query.limit !== null ? sorted.slice(0, query.limit) : sorted
}

export interface QueryGroup {
  key: string
  notes: VaultEntry[]
}

const NO_GROUP_LABEL = 'None'

function groupKeyFor(entry: VaultEntry, field: string): string {
  const value = fieldValue(entry, field)
  if (value === null || value === '') return NO_GROUP_LABEL
  return String(value)
}

/**
 * Evaluates a query and groups the results by `groupBy` (a single group when
 * unset). Groups are sorted by key, with the empty "None" group last.
 */
export function groupResults(query: GroverQuery, entries: VaultEntry[], now: Date = new Date()): QueryGroup[] {
  const rows = evaluateQuery(query, entries, now)
  if (!query.groupBy) return [{ key: '', notes: rows }]
  const groups = new Map<string, VaultEntry[]>()
  for (const entry of rows) {
    const key = groupKeyFor(entry, query.groupBy)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(entry)
  }
  return [...groups.entries()]
    .map(([key, notes]) => ({ key, notes }))
    .sort((a, b) => {
      if (a.key === NO_GROUP_LABEL) return 1
      if (b.key === NO_GROUP_LABEL) return -1
      return a.key.localeCompare(b.key)
    })
}
