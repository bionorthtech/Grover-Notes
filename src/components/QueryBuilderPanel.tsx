import { useState } from 'react'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import {
  buildQuerySource,
  BUILDER_OPERATORS,
  EMPTY_BUILDER,
  type BuilderCondition,
  type QueryBuilderState,
} from '../lib/queryBuilder'
import type { QueryOperator } from '../lib/queryBlocks'

interface QueryBuilderPanelProps {
  types: string[]
  onChange: (source: string) => void
}

const ANY = '__any__'
const UNARY = new Set<QueryOperator>(['exists', 'empty'])

/** Form controls that generate grover-query DSL into the runner. */
export function QueryBuilderPanel({ types, onChange }: QueryBuilderPanelProps) {
  const [state, setState] = useState<QueryBuilderState>({ ...EMPTY_BUILDER, conditions: [{ field: '', operator: '=', value: '' }] })

  const update = (next: QueryBuilderState) => { setState(next); onChange(buildQuerySource(next)) }
  const setConditions = (conditions: BuilderCondition[]) => update({ ...state, conditions })
  const patchCondition = (i: number, patch: Partial<BuilderCondition>) =>
    setConditions(state.conditions.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))

  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <div className="flex items-center gap-2">
        <span className="w-12 shrink-0 text-xs text-muted-foreground">From</span>
        <Select value={state.from || ANY} onValueChange={(v) => update({ ...state, from: v === ANY ? '' : v })}>
          <SelectTrigger className="h-8 flex-1 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value={ANY}>Any type</SelectItem>
            {types.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <span className="text-xs text-muted-foreground">Where</span>
        {state.conditions.map((condition, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <Input value={condition.field} onChange={(e) => patchCondition(i, { field: e.target.value })} placeholder="field" className="h-8 flex-1 text-sm" />
            <Select value={condition.operator} onValueChange={(v) => patchCondition(i, { operator: v as QueryOperator })}>
              <SelectTrigger className="h-8 w-24 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent position="popper">
                {BUILDER_OPERATORS.map((op) => <SelectItem key={op} value={op}>{op}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input
              value={condition.value}
              onChange={(e) => patchCondition(i, { value: e.target.value })}
              placeholder="value"
              disabled={UNARY.has(condition.operator)}
              className="h-8 flex-1 text-sm"
            />
            <button
              type="button"
              onClick={() => setConditions(state.conditions.filter((_, idx) => idx !== i))}
              aria-label="Remove condition"
              className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-[var(--state-hover)] hover:text-foreground"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          </div>
        ))}
        <Button variant="ghost" className="h-7 px-2 text-xs" onClick={() => setConditions([...state.conditions, { field: '', operator: '=', value: '' }])}>
          + Add condition
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <span className="w-12 shrink-0 text-xs text-muted-foreground">Sort</span>
        <Input value={state.sortField} onChange={(e) => update({ ...state, sortField: e.target.value })} placeholder="field" className="h-8 flex-1 text-sm" />
        <Select value={state.sortDirection} onValueChange={(v) => update({ ...state, sortDirection: v as 'asc' | 'desc' })}>
          <SelectTrigger className="h-8 w-24 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="desc">desc</SelectItem>
            <SelectItem value="asc">asc</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <span className="w-12 shrink-0 text-xs text-muted-foreground">Group</span>
        <Input value={state.groupBy} onChange={(e) => update({ ...state, groupBy: e.target.value })} placeholder="field (optional)" className="h-8 flex-1 text-sm" />
        <span className="shrink-0 text-xs text-muted-foreground">Limit</span>
        <Input value={state.limit} onChange={(e) => update({ ...state, limit: e.target.value.replace(/\D/g, '') })} placeholder="∞" inputMode="numeric" className="h-8 w-16 text-sm" />
      </div>
    </div>
  )
}
