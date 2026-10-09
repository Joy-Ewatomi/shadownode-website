import ELK, { type ElkNode } from "elkjs/lib/elk.bundled.js"

export type ReportGraphLayout = "network" | "hierarchical"

export type ReportGraphLayoutNode = {
  id: string
  x: number
  y: number
  width: number
  height: number
}

export type ReportGraphLayoutEdge = {
  id: string
  sections: Array<{
    startPoint?: { x: number; y: number }
    bendPoints?: Array<{ x: number; y: number }>
    endPoint?: { x: number; y: number }
  }>
}

export type HierarchicalGraphLayout = {
  width: number
  height: number
  nodes: Map<string, ReportGraphLayoutNode>
  edges: Map<string, ReportGraphLayoutEdge>
}

/**
 * Uses ELK's layered algorithm for a directed, non-tree graph. Every edge is
 * retained, including cross-branch relationships, so a hierarchy never turns
 * an investigative network into a misleading pure tree.
 */
export async function layoutHierarchicalReportGraph(input: {
  entities: Array<{ id: string }>
  relationships: Array<{ id: string; source_entity_id: string; target_entity_id: string }>
  compact?: boolean
}): Promise<HierarchicalGraphLayout> {
  const nodeWidth = input.compact ? 154 : 240
  const nodeHeight = input.compact ? 58 : 78
  const entityIds = new Set(input.entities.map((entity) => entity.id))
  const elk = new ELK()
  const graph: ElkNode = {
    id: "case-graph",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
      "elk.spacing.nodeNode": input.compact ? "32" : "54",
      "elk.layered.spacing.nodeNodeBetweenLayers": input.compact ? "48" : "86",
      "elk.padding": "[top=48,left=56,bottom=74,right=56]",
    },
    children: input.entities.map((entity) => ({
      id: entity.id,
      width: nodeWidth,
      height: nodeHeight,
    })),
    edges: input.relationships
      .filter((relationship) => entityIds.has(relationship.source_entity_id) && entityIds.has(relationship.target_entity_id))
      .map((relationship) => ({
        id: relationship.id,
        sources: [relationship.source_entity_id],
        targets: [relationship.target_entity_id],
      })),
  }

  const result = await elk.layout(graph)
  const nodes = new Map<string, ReportGraphLayoutNode>()
  for (const node of result.children || []) {
    nodes.set(node.id, {
      id: node.id,
      x: Number(node.x || 0),
      y: Number(node.y || 0),
      width: Number(node.width || nodeWidth),
      height: Number(node.height || nodeHeight),
    })
  }

  const edges = new Map<string, ReportGraphLayoutEdge>()
  for (const edge of result.edges || []) {
    edges.set(edge.id, {
      id: edge.id,
      sections: (edge.sections || []).map((section) => ({
        startPoint: section.startPoint,
        bendPoints: section.bendPoints,
        endPoint: section.endPoint,
      })),
    })
  }

  return {
    width: Math.max(920, Number(result.width || 0)),
    height: Math.max(520, Number(result.height || 0) + 54),
    nodes,
    edges,
  }
}
