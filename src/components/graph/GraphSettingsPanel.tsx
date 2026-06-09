import { useState, type ReactNode } from 'react'
import { Slider } from '../ui/slider'
import { Switch } from '../ui/switch'
import type { GraphParams } from './graphParams'

interface GraphSettingsPanelProps {
  params: GraphParams
  onChange: (params: GraphParams) => void
  onClose: () => void
  onRelayout: () => void
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
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[12px] text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums text-[11px] text-[var(--text-tertiary)]">{value}</span>
      </div>
      <Slider value={value} min={min} max={max} step={step} onChange={onChange} aria-label={label} />
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="space-y-2.5">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 text-left text-[12px] font-medium text-foreground"
      >
        <svg
          width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
          className={`text-muted-foreground transition-transform ${open ? 'rotate-90' : ''}`}
        >
          <path d="M6 3.5 11 8l-5 4.5" />
        </svg>
        {title}
      </button>
      {open && <div className="space-y-2.5 pl-1">{children}</div>}
    </div>
  )
}

/** Floating, collapsible graph controls — styled after Obsidian's graph settings card. */
export function GraphSettingsPanel({ params, onChange, onClose, onRelayout }: GraphSettingsPanelProps) {
  const set = (patch: Partial<GraphParams>) => onChange({ ...params, ...patch })

  return (
    <div
      data-testid="graph-settings"
      className="grover-fade-up absolute right-3 top-3 z-20 flex max-h-[calc(100%-24px)] w-[230px] flex-col gap-3 overflow-y-auto rounded-xl border border-[var(--border-dialog)] bg-popover/95 p-3 shadow-[0_8px_28px_var(--shadow-dialog)] backdrop-blur"
    >
      <div className="flex items-center justify-end gap-1 text-muted-foreground">
        <button
          type="button"
          onClick={onRelayout}
          aria-label="Re-run layout"
          title="Re-run layout"
          className="flex size-6 items-center justify-center rounded-md transition-colors hover:bg-[var(--state-hover)] hover:text-foreground"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Hide graph settings"
          title="Hide settings"
          className="flex size-6 items-center justify-center rounded-md transition-colors hover:bg-[var(--state-hover)] hover:text-foreground"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>

      <Section title="Display">
        <div className="flex items-center justify-between text-[12px] text-muted-foreground">
          <span>Show labels</span>
          <Switch checked={params.showLabels} onCheckedChange={(checked) => set({ showLabels: checked })} aria-label="Show labels" />
        </div>
        <SliderRow label="Text fade threshold" value={params.textFade} min={0} max={1} step={0.05} onChange={(v) => set({ textFade: v })} />
        <SliderRow label="Node size" value={params.nodeSize} min={0.5} max={3} step={0.1} onChange={(v) => set({ nodeSize: v })} />
        <SliderRow label="Link thickness" value={params.linkThickness} min={1} max={5} step={0.5} onChange={(v) => set({ linkThickness: v })} />
      </Section>

      <Section title="Forces">
        <SliderRow label="Centre force" value={params.centerForce} min={0} max={1} step={0.05} onChange={(v) => set({ centerForce: v })} />
        <SliderRow label="Repel force" value={params.repelForce} min={0} max={2} step={0.1} onChange={(v) => set({ repelForce: v })} />
        <SliderRow label="Link force" value={params.linkForce} min={0} max={2} step={0.1} onChange={(v) => set({ linkForce: v })} />
        <SliderRow label="Link distance" value={params.linkDistance} min={30} max={200} step={5} onChange={(v) => set({ linkDistance: v })} />
      </Section>
    </div>
  )
}
