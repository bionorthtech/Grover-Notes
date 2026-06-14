import { useEffect, useMemo, useRef } from 'react'
import type { VaultEntry } from '../../types'
import { buildGraphData, filterGraph, UNTYPED_KEY, type GraphFilter } from './graphData'
import { DEFAULT_GRAPH_PARAMS, type GraphParams } from './graphParams'
import { darken, isGreyish, labelAlpha } from './graphMath'

interface GraphViewProps {
  entries: VaultEntry[]
  onOpenNote: (path: string) => void
  params?: GraphParams
  /** Bump to re-seed and re-settle the layout (the settings panel "refresh" button). */
  relayoutNonce?: number
  /** Type-hiding / local-graph filter applied to the built graph. */
  filter?: GraphFilter
  /** Surface unlinked notes as isolated dots. */
  includeOrphans?: boolean
  /** Colour nodes by their type instead of a single accent. */
  colorByType?: boolean
  /** Maps a node's type (or `UNTYPED_KEY`) to a CSS colour expression. */
  typeColorExpr?: (type: string) => string
}

const NO_HIDDEN: GraphFilter = { hiddenTypes: new Set() }

interface SimNode {
  id: string
  label: string
  type: string
  degree: number
  x: number
  y: number
  vx: number
  vy: number
  pinned: boolean
}

function cssColor(el: HTMLElement, name: string, fallback: string): string {
  const value = getComputedStyle(el).getPropertyValue(name).trim()
  return value || fallback
}

function baseRadius(degree: number): number {
  return Math.min(3.5 + degree * 0.7, 16)
}

function tick(nodes: SimNode[], links: Array<[number, number]>, alpha: number, p: GraphParams): void {
  const repulsion = 1400 * p.repelForce
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i]
    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j]
      let dx = a.x - b.x
      let dy = a.y - b.y
      let distSq = dx * dx + dy * dy
      if (distSq < 0.01) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; distSq = 0.01 }
      const dist = Math.sqrt(distSq)
      const force = (repulsion / distSq) * alpha
      a.vx += (dx / dist) * force; a.vy += (dy / dist) * force
      b.vx -= (dx / dist) * force; b.vy -= (dy / dist) * force
    }
  }

  for (const [s, t] of links) {
    const a = nodes[s]
    const b = nodes[t]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const dist = Math.sqrt(dx * dx + dy * dy) || 0.01
    const force = (dist - p.linkDistance) * 0.03 * p.linkForce * alpha
    const fx = (dx / dist) * force
    const fy = (dy / dist) * force
    a.vx += fx; a.vy += fy
    b.vx -= fx; b.vy -= fy
  }

  for (const node of nodes) {
    if (node.pinned) { node.vx = 0; node.vy = 0; continue }
    node.vx -= node.x * 0.024 * p.centerForce * alpha
    node.vy -= node.y * 0.024 * p.centerForce * alpha
    node.x += node.vx
    node.y += node.vy
    node.vx *= 0.82
    node.vy *= 0.82
  }
}

export function GraphView({
  entries, onOpenNote, params = DEFAULT_GRAPH_PARAMS, relayoutNonce = 0,
  filter = NO_HIDDEN, includeOrphans = false, colorByType = false, typeColorExpr,
}: GraphViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const data = useMemo(
    () => filterGraph(buildGraphData(entries, { includeOrphans }), filter),
    [entries, includeOrphans, filter],
  )
  // Live values read inside the long-lived canvas effect's closures, kept in
  // refs so prop changes don't tear down and re-seed the simulation.
  const onOpenRef = useRef(onOpenNote)
  const paramsRef = useRef(params)
  const colorByTypeRef = useRef(colorByType)
  const typeColorRef = useRef(typeColorExpr)
  useEffect(() => {
    onOpenRef.current = onOpenNote
    paramsRef.current = params
    colorByTypeRef.current = colorByType
    typeColorRef.current = typeColorExpr
  })

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const baseGreen = darken(cssColor(wrap, '--accent-blue', '#5FC98C'), 0.6)
    const colors = {
      node: baseGreen,
      edge: cssColor(wrap, '--text-primary', '#E6E1D8'),
      text: cssColor(wrap, '--text-secondary', '#B8B1A6'),
      hi: cssColor(wrap, '--accent-blue-hover', '#84DBA8'),
    }

    // Resolve CSS colour expressions (e.g. "var(--accent-purple)") to concrete
    // canvas colours via a throwaway probe, cached per expression.
    const probe = document.createElement('span')
    probe.style.cssText = 'position:absolute;width:0;height:0;visibility:hidden'
    wrap.appendChild(probe)
    const resolvedCache = new Map<string, string>()
    const resolveExpr = (expr: string): string => {
      const cached = resolvedCache.get(expr)
      if (cached) return cached
      probe.style.color = ''
      probe.style.color = expr
      const value = getComputedStyle(probe).color || baseGreen
      resolvedCache.set(expr, value)
      return value
    }
    const colorForType = (type: string): string => {
      if (!colorByTypeRef.current || !typeColorRef.current) return baseGreen
      const resolved = resolveExpr(typeColorRef.current(type))
      // Untyped / unmapped types resolve to a muted grey — fall back to the brand
      // green so the graph stays a cohesive dark-green palette. Typed colours are
      // darkened hard into a deep tone.
      if (isGreyish(resolved)) return baseGreen
      return darken(resolved, 0.6)
    }

    const spread = Math.min(wrap.clientWidth, wrap.clientHeight) * 0.4 + 1
    const nodes: SimNode[] = data.nodes.map((node, index) => {
      const angle = (index / Math.max(data.nodes.length, 1)) * Math.PI * 2
      return {
        id: node.id, label: node.label, degree: node.degree, type: node.isA ?? UNTYPED_KEY,
        x: Math.cos(angle) * spread * (0.3 + Math.random() * 0.7),
        y: Math.sin(angle) * spread * (0.3 + Math.random() * 0.7),
        vx: 0, vy: 0, pinned: false,
      }
    })
    const indexById = new Map(nodes.map((node, i) => [node.id, i]))
    const links: Array<[number, number]> = data.edges
      .map((edge) => [indexById.get(edge.source), indexById.get(edge.target)] as [number | undefined, number | undefined])
      .filter((pair): pair is [number, number] => pair[0] !== undefined && pair[1] !== undefined)
    const neighborSets = new Map<SimNode, Set<SimNode>>()
    for (const [s, t] of links) {
      if (!neighborSets.has(nodes[s])) neighborSets.set(nodes[s], new Set())
      if (!neighborSets.has(nodes[t])) neighborSets.set(nodes[t], new Set())
      neighborSets.get(nodes[s])!.add(nodes[t])
      neighborSets.get(nodes[t])!.add(nodes[s])
    }

    let alpha = 1
    for (let i = 0; i < 140; i++) { tick(nodes, links, alpha, paramsRef.current); alpha *= 0.985 }

    const camera = { scale: 1, x: 0, y: 0 }
    let hovered: SimNode | null = null
    let userInteracted = false

    function fitCamera() {
      if (nodes.length === 0) return
      let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity
      for (const node of nodes) { bx0 = Math.min(bx0, node.x); by0 = Math.min(by0, node.y); bx1 = Math.max(bx1, node.x); by1 = Math.max(by1, node.y) }
      const w = wrap!.clientWidth, h = wrap!.clientHeight
      camera.scale = Math.min(w / ((bx1 - bx0) + 160), h / ((by1 - by0) + 160), 1.4)
      camera.x = w / 2 - ((bx0 + bx1) / 2) * camera.scale
      camera.y = h / 2 - ((by0 + by1) / 2) * camera.scale
    }

    function resize() {
      const dpr = window.devicePixelRatio || 1
      canvas!.width = wrap!.clientWidth * dpr
      canvas!.height = wrap!.clientHeight * dpr
      canvas!.style.width = `${wrap!.clientWidth}px`
      canvas!.style.height = `${wrap!.clientHeight}px`
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (!userInteracted) fitCamera()
    }
    resize()
    fitCamera()
    const refitTimer = window.setTimeout(() => { if (!userInteracted) fitCamera() }, 450)

    const toScreen = (x: number, y: number) => ({ x: x * camera.scale + camera.x, y: y * camera.scale + camera.y })
    const toWorld = (sx: number, sy: number) => ({ x: (sx - camera.x) / camera.scale, y: (sy - camera.y) / camera.scale })

    function render() {
      const p = paramsRef.current
      ctx!.clearRect(0, 0, wrap!.clientWidth, wrap!.clientHeight)
      const hoverNeighbors = hovered ? neighborSets.get(hovered) : undefined
      ctx!.lineWidth = p.linkThickness
      for (const [s, t] of links) {
        const a = nodes[s]
        const b = nodes[t]
        const sa = toScreen(a.x, a.y)
        const sb = toScreen(b.x, b.y)
        const touchesHover = hovered !== null && (a === hovered || b === hovered)
        ctx!.strokeStyle = touchesHover ? colors.hi : colors.edge
        ctx!.globalAlpha = hovered ? (touchesHover ? 0.9 : 0.14) : 0.55
        ctx!.beginPath(); ctx!.moveTo(sa.x, sa.y); ctx!.lineTo(sb.x, sb.y); ctx!.stroke()
      }
      const fade = labelAlpha(camera.scale, p.textFade)
      for (const node of nodes) {
        const screen = toScreen(node.x, node.y)
        const r = Math.max(baseRadius(node.degree) * p.nodeSize * camera.scale, 2)
        const isHover = node === hovered
        const isNeighbor = hoverNeighbors?.has(node) ?? false
        ctx!.globalAlpha = hovered && !isHover && !isNeighbor ? 0.3 : 1
        ctx!.beginPath(); ctx!.arc(screen.x, screen.y, r, 0, Math.PI * 2)
        ctx!.fillStyle = isHover ? colors.hi : colorForType(node.type)
        ctx!.fill()
        const a = isHover ? 1 : (p.showLabels ? fade : 0)
        if (a > 0.02) {
          ctx!.globalAlpha = hovered && !isHover && !isNeighbor ? a * 0.3 : a
          ctx!.fillStyle = isHover ? colors.edge : colors.text
          ctx!.font = '11px ui-sans-serif, system-ui, sans-serif'
          ctx!.textAlign = 'center'
          ctx!.fillText(node.label.slice(0, 26), screen.x, screen.y + r + 12)
        }
      }
      ctx!.globalAlpha = 1
    }

    let alphaLive = 0.04
    let lastForceKey = ''
    let raf = 0
    function frame() {
      const p = paramsRef.current
      const forceKey = `${p.centerForce}|${p.repelForce}|${p.linkForce}|${p.linkDistance}`
      if (forceKey !== lastForceKey) { lastForceKey = forceKey; alphaLive = 0.5 }
      tick(nodes, links, Math.max(alphaLive, 0.02), p)
      alphaLive *= 0.96
      render()
      raf = requestAnimationFrame(frame)
    }
    frame()

    function nodeAt(sx: number, sy: number): SimNode | null {
      const world = toWorld(sx, sy)
      let best: SimNode | null = null
      let bestDist = Infinity
      for (const node of nodes) {
        const dx = node.x - world.x, dy = node.y - world.y
        const d = dx * dx + dy * dy
        const hitR = (baseRadius(node.degree) * paramsRef.current.nodeSize + 6) / camera.scale
        if (d < hitR * hitR && d < bestDist) { best = node; bestDist = d }
      }
      return best
    }

    let panning = false
    let dragNode: SimNode | null = null
    let moved = false
    let lastX = 0, lastY = 0
    function pointerDown(e: PointerEvent) {
      const rect = canvas!.getBoundingClientRect()
      moved = false
      lastX = e.clientX; lastY = e.clientY
      canvas!.setPointerCapture(e.pointerId)
      const hit = nodeAt(e.clientX - rect.left, e.clientY - rect.top)
      if (hit) { dragNode = hit; hit.pinned = true } else { panning = true }
    }
    function pointerMove(e: PointerEvent) {
      const rect = canvas!.getBoundingClientRect()
      if (dragNode) {
        const world = toWorld(e.clientX - rect.left, e.clientY - rect.top)
        if (Math.abs(e.clientX - lastX) + Math.abs(e.clientY - lastY) > 2) { moved = true; userInteracted = true; alphaLive = 0.3 }
        dragNode.x = world.x; dragNode.y = world.y
      } else if (panning) {
        const dx = e.clientX - lastX, dy = e.clientY - lastY
        if (Math.abs(dx) + Math.abs(dy) > 2) { moved = true; userInteracted = true }
        camera.x += dx; camera.y += dy; lastX = e.clientX; lastY = e.clientY
      } else {
        const next = nodeAt(e.clientX - rect.left, e.clientY - rect.top)
        if (next !== hovered) { hovered = next; canvas!.style.cursor = next ? 'pointer' : 'grab' }
      }
    }
    function pointerUp() {
      if (dragNode) {
        if (!moved) onOpenRef.current(dragNode.id)
        dragNode.pinned = false
        dragNode = null
      }
      panning = false
    }
    function wheel(e: WheelEvent) {
      e.preventDefault()
      userInteracted = true
      const rect = canvas!.getBoundingClientRect()
      const sx = e.clientX - rect.left, sy = e.clientY - rect.top
      const before = toWorld(sx, sy)
      camera.scale = Math.max(0.15, Math.min(4, camera.scale * (e.deltaY < 0 ? 1.1 : 1 / 1.1)))
      const after = toWorld(sx, sy)
      camera.x += (after.x - before.x) * camera.scale
      camera.y += (after.y - before.y) * camera.scale
    }

    canvas.style.cursor = 'grab'
    canvas.addEventListener('pointerdown', pointerDown)
    canvas.addEventListener('pointermove', pointerMove)
    canvas.addEventListener('pointerup', pointerUp)
    canvas.addEventListener('wheel', wheel, { passive: false })
    const resizeObserver = new ResizeObserver(() => resize())
    resizeObserver.observe(wrap)

    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(refitTimer)
      canvas.removeEventListener('pointerdown', pointerDown)
      canvas.removeEventListener('pointermove', pointerMove)
      canvas.removeEventListener('pointerup', pointerUp)
      canvas.removeEventListener('wheel', wheel)
      resizeObserver.disconnect()
      probe.remove()
    }
  }, [data, relayoutNonce])

  return (
    <div ref={wrapRef} className="relative h-full w-full overflow-hidden bg-[var(--surface-app)]">
      <canvas ref={canvasRef} data-testid="graph-canvas" />
      {data.shown === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          No linked notes to graph yet. Add some [[wikilinks]] between notes.
        </div>
      )}
    </div>
  )
}
