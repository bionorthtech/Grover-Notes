export interface GraphParams {
  centerForce: number
  repelForce: number
  linkForce: number
  linkDistance: number
  nodeSize: number
  linkThickness: number
  showLabels: boolean
  /** 0..1 — how aggressively labels fade out while zoomed out (Obsidian's "text fade threshold"). */
  textFade: number
}

export const DEFAULT_GRAPH_PARAMS: GraphParams = {
  centerForce: 0.5,
  repelForce: 1,
  linkForce: 1,
  linkDistance: 70,
  nodeSize: 1.4,
  linkThickness: 2,
  showLabels: true,
  textFade: 0.5,
}
