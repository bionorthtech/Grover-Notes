import { Slider } from '../ui/slider'
import { Switch } from '../ui/switch'
import type { GraphParams } from './graphParams'

interface GraphSettingsPanelProps {
  params: GraphParams
  onChange: (params: GraphParams) => void
  onClose: () => void
}

function SliderRow({ label, value, min, max, step, onChange }: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[12px] text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums text-[11px] text-[var(--text-tertiary)]">{value}</span>
      </div>
      <Slider value={value} min={min} max={max} step={step} onChange={onChange} aria-label={label} />
    </div>
  )
}

export function GraphSettingsPanel({ params, onChange, onClose }: GraphSettingsPanelProps) {
  const set = (patch: Partial<GraphParams>) => onChange({ ...params, ...patch })

  return (
    <aside
      data-testid="graph-settings"
      className="grover-fade-up flex w-[232px] shrink-0 flex-col gap-4 overflow-y-auto border-l border-border bg-[var(--surface-sidebar)] px-3 py-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Display</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Hide graph settings"
          className="rounded px-1 text-xs text-muted-foreground transition-colors hover:bg-[var(--state-hover)] hover:text-foreground"
        >
          ✕
        </button>
      </div>

      <div className="flex items-center justify-between text-[12px] text-muted-foreground">
        <span>Show labels</span>
        <Switch checked={params.showLabels} onCheckedChange={(checked) => set({ showLabels: checked })} aria-label="Show labels" />
      </div>
      <SliderRow label="Node size" value={params.nodeSize} min={0.5} max={3} step={0.1} onChange={(v) => set({ nodeSize: v })} />
      <SliderRow label="Link thickness" value={params.linkThickness} min={1} max={5} step={0.5} onChange={(v) => set({ linkThickness: v })} />

      <span className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Forces</span>
      <SliderRow label="Centre force" value={params.centerForce} min={0} max={1} step={0.05} onChange={(v) => set({ centerForce: v })} />
      <SliderRow label="Repel force" value={params.repelForce} min={0} max={2} step={0.1} onChange={(v) => set({ repelForce: v })} />
      <SliderRow label="Link force" value={params.linkForce} min={0} max={2} step={0.1} onChange={(v) => set({ linkForce: v })} />
      <SliderRow label="Link distance" value={params.linkDistance} min={30} max={200} step={5} onChange={(v) => set({ linkDistance: v })} />
    </aside>
  )
}
