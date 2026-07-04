export interface TraceSummary {
  operation: string | null
  duration_ms: number
  breakdown: Record<string, unknown>
  errors: string[]
}

export interface GraphCounts {
  num_nodes: number
  num_edges: number
}

export interface QueryResponse {
  answer: string
  raw_count?: number
  cited_chunk_ids?: string[]
  cited_data_ids?: string[]
  as_of_ms?: number
  trace: TraceSummary
}

export interface LogEntry {
  id: number
  timestamp: string
  question: string
  answer_text: string
  cited_chunk_ids: string[]
  cited_data_ids: string[]
  suspect: boolean
  resolved: boolean
}

export interface ReaskResponse {
  old_cited_data_ids: string[]
  new_cited_data_ids: string[]
  new_answer: string
  changed: boolean
  new_log_id: number | null
}

export interface GraphResponse {
  html: string
}

export type GraphNodeKind = 'document' | 'chunk' | 'summary' | 'type' | 'entity'

export interface GraphNode {
  id: string
  label: string
  kind: GraphNodeKind
  truth: number | null
}

export interface GraphEdge {
  source: string
  target: string
  label: string
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
  suspect_ids: string[]
}

export interface Dataset {
  id: string
  name: string
  created_at: string
}

export interface DatasetDocument {
  id: string
  name: string
  created_at: string
  stale: boolean
  contradiction: boolean
}

export interface Contradiction {
  data_id: string
  reason: string
}

export interface IngestResponse {
  status: string
  dataset: string
  trace: TraceSummary
  counts_before: GraphCounts
  counts_after: GraphCounts
  contradiction: Contradiction | null
}

export interface BlastRadius {
  count: number
  most_recent: string | null
  avg_confidence: number
}

export interface ForgetResponse {
  status: string
  dataset: string
  data_id: string | null
  flagged_count: number
  blast_radius: BlastRadius
  trace_before: TraceSummary
  counts_before: GraphCounts
  counts_after: GraphCounts
}

export type ForgetPreview =
  | { dataset: string; data_id: string; count: number; most_recent: string | null; avg_confidence: number }
  | { dataset: string; document_count: number }

export interface ImproveResponse {
  status: string
  dataset: string
  trace: TraceSummary
  counts_before: GraphCounts
  counts_after: GraphCounts
}
