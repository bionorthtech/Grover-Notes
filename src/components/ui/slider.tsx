import { useRef } from 'react'
import { cn } from '../../lib/utils'

interface SliderProps {
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  className?: string
  'aria-label'?: string
}

/** Lightweight, dependency-free slider (pointer + keyboard). */
export function Slider({ value, min, max, step = 1, onChange, className, ...rest }: SliderProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const percent = max > min ? ((value - min) / (max - min)) * 100 : 0

  const setFromClientX = (clientX: number) => {
    const el = trackRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const ratio = rect.width > 0 ? Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) : 0
    const stepped = Math.round((min + ratio * (max - min)) / step) * step
    onChange(Math.min(max, Math.max(min, stepped)))
  }

  return (
    <div
      ref={trackRef}
      role="slider"
      tabIndex={0}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-label={rest['aria-label']}
      className={cn('relative flex h-4 cursor-pointer items-center select-none', className)}
      onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setFromClientX(event.clientX) }}
      onPointerMove={(event) => { if (event.buttons === 1) setFromClientX(event.clientX) }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') { event.preventDefault(); onChange(Math.max(min, value - step)) }
        if (event.key === 'ArrowRight' || event.key === 'ArrowUp') { event.preventDefault(); onChange(Math.min(max, value + step)) }
      }}
    >
      <div className="h-1 w-full rounded-full bg-[var(--state-hover)]" />
      <div className="absolute h-1 rounded-full bg-[var(--accent-blue)]" style={{ width: `${percent}%` }} />
      <div
        className="absolute size-3 -translate-x-1/2 rounded-full border border-[var(--accent-blue)] bg-[var(--surface-popover)] shadow-sm"
        style={{ left: `${percent}%` }}
      />
    </div>
  )
}
