import { useEffect, useMemo, useRef, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { getGraphData } from '../api'
import { ErrorState } from '../components/ErrorState'
import { useAsync } from '../hooks/useAsync'
import type { GraphNode, GraphNodeKind } from '../types'

const KIND_COLOR: Record<GraphNodeKind, string> = {
  document: '#BC9AFF',
  chunk: '#C4ABEE',
  summary: '#D8C7F5',
  type: '#D0D0D6',
  entity: '#9A9AA2',
}

const SUSPECT_COLOR = '#E5484D'
const HIGHLIGHT = '#6D40E0'
const DIM = '#E4E4E7'

const LEGEND: { label: string; color: string }[] = [
  { label: 'source document', color: KIND_COLOR.document },
  { label: 'entity', color: KIND_COLOR.entity },
  { label: 'suspect (cited by a stale answer)', color: SUSPECT_COLOR },
  { label: 'selected + its blast radius', color: HIGHLIGHT },
]

export function GraphPage() {
  const graph = useAsync(getGraphData)
  const wrapRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(null)
  const [width, setWidth] = useState(800)
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    graph.run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!wrapRef.current) return
    const el = wrapRef.current
    const update = () => setWidth(el.clientWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const data = graph.state.status === 'success' ? graph.state.data : null

  // spread the cluster so labels stop colliding (default charge ~-30 is too tight for 120+ nodes)
  useEffect(() => {
    if (!data || !fgRef.current) return
    fgRef.current.d3Force('charge')?.strength(-150)
    fgRef.current.d3Force('link')?.distance(48)
    fgRef.current.d3ReheatSimulation?.()
  }, [data])

  const suspectSet = useMemo(() => new Set(data?.suspect_ids ?? []), [data])

  // adjacency for the blast-radius highlight on click
  const neighbors = useMemo(() => {
    const m = new Map<string, Set<string>>()
    if (!data) return m
    for (const e of data.edges) {
      if (!m.has(e.source)) m.set(e.source, new Set())
      if (!m.has(e.target)) m.set(e.target, new Set())
      m.get(e.source)!.add(e.target)
      m.get(e.target)!.add(e.source)
    }
    return m
  }, [data])

  const active = useMemo(() => {
    if (!selected) return null
    const set = new Set<string>([selected])
    neighbors.get(selected)?.forEach((n) => set.add(n))
    return set
  }, [selected, neighbors])

  // ForceGraph mutates its input, so hand it fresh objects each render-set
  const fgData = useMemo(() => {
    if (!data) return { nodes: [], links: [] }
    return {
      nodes: data.nodes.map((n) => ({ ...n })),
      links: data.edges.map((e) => ({ source: e.source, target: e.target, label: e.label })),
    }
  }, [data])

  function nodeColor(node: GraphNode): string {
    if (active && !active.has(node.id)) return DIM
    if (active?.has(node.id) && node.id === selected) return HIGHLIGHT
    if (suspectSet.has(node.id)) return SUSPECT_COLOR
    return KIND_COLOR[node.kind]
  }

  const selectedNode = data?.nodes.find((n) => n.id === selected) ?? null

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="font-mono text-xs text-gray-500">
          {data ? `${data.nodes.length} nodes · ${data.edges.length} edges` : 'memory graph'}
        </p>
        {selected && (
          <button
            onClick={() => setSelected(null)}
            className="font-mono text-xs text-accent hover:underline"
          >
            clear selection
          </button>
        )}
      </div>

      <div
        ref={wrapRef}
        className="relative overflow-hidden rounded-xl border border-gray-200 bg-white"
      >
        {graph.state.status === 'loading' && (
          <div className="flex h-[560px] items-center justify-center text-sm text-gray-500">
            Loading graph...
          </div>
        )}
        {graph.state.status === 'error' && (
          <div className="p-4">
            <ErrorState message={graph.state.error} />
          </div>
        )}
        {data && (
          <ForceGraph2D
            ref={fgRef}
            graphData={fgData}
            width={width}
            height={560}
            backgroundColor="#ffffff"
            onEngineStop={() => fgRef.current?.zoomToFit(400, 50)}
            nodeRelSize={4}
            nodeVal={(n) =>
              (n as GraphNode).kind === 'document' ? 6 : suspectSet.has((n as GraphNode).id) ? 4 : 1.5
            }
            nodeColor={(n) => nodeColor(n as GraphNode)}
            nodeLabel={(n) => `${(n as GraphNode).label} · ${(n as GraphNode).kind}`}
            linkColor={(l) => {
              if (!active) return '#EDEDF0'
              const s = typeof l.source === 'object' ? (l.source as GraphNode).id : (l.source as string)
              const t = typeof l.target === 'object' ? (l.target as GraphNode).id : (l.target as string)
              return active.has(s) && active.has(t) ? HIGHLIGHT : '#F1F1F3'
            }}
            linkWidth={(l) => {
              if (!active) return 0.5
              const s = typeof l.source === 'object' ? (l.source as GraphNode).id : (l.source as string)
              const t = typeof l.target === 'object' ? (l.target as GraphNode).id : (l.target as string)
              return active.has(s) && active.has(t) ? 1.5 : 0.5
            }}
            onNodeClick={(n) => setSelected((n as GraphNode).id)}
            nodeCanvasObjectMode={(n) => {
              const node = n as GraphNode
              const deg = neighbors.get(node.id)?.size ?? 0
              return suspectSet.has(node.id) || (node.kind === 'entity' && deg >= 5)
                ? 'after'
                : undefined
            }}
            nodeCanvasObject={(n, ctx, scale) => {
              const node = n as GraphNode & { x: number; y: number }
              if (active && !active.has(node.id)) return
              const label = node.label.length > 18 ? node.label.slice(0, 17) + '…' : node.label
              const fontSize = 11 / scale
              ctx.font = `${fontSize}px ui-monospace, monospace`
              ctx.textAlign = 'center'
              ctx.textBaseline = 'middle'
              ctx.fillStyle = suspectSet.has(node.id) ? SUSPECT_COLOR : '#16161A'
              ctx.fillText(label, node.x, node.y - 9 / scale)
            }}
            cooldownTicks={100}
          />
        )}

        {selectedNode && (
          <div className="absolute right-3 top-3 max-w-[240px] rounded-lg border border-gray-200 bg-white/95 p-3 font-mono text-xs shadow-sm">
            <p className="font-bold text-gray-900">{selectedNode.label}</p>
            <p className="mt-1 text-gray-500">kind: {selectedNode.kind}</p>
            {selectedNode.truth != null && (
              <p className="text-gray-500">truth: {selectedNode.truth.toFixed(2)}</p>
            )}
            <p className="text-gray-500">
              connections: {neighbors.get(selectedNode.id)?.size ?? 0}
            </p>
          </div>
        )}
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
        {LEGEND.map((l) => (
          <li key={l.label} className="flex items-center gap-2 font-mono text-xs text-gray-600">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: l.color }} />
            {l.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
