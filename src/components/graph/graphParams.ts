export interface GraphParams {
  centerForce: number
  repelForce: number
  linkForce: number
  linkDistance: number
  nodeSize: number
  linkThickness: number
  showLabels: boolean
}

export const DEFAULT_GRAPH_PARAMS: GraphParams = {
  centerForce: 0.5,
  repelForce: 1,
  linkForce: 1,
  linkDistance: 70,
  nodeSize: 1.4,
  linkThickness: 2,
  showLabels: true,
}
