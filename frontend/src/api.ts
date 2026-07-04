import type {
  Dataset,
  DatasetDocument,
  ForgetPreview,
  ForgetResponse,
  GraphData,
  GraphResponse,
  ImproveResponse,
  IngestResponse,
  LogEntry,
  QueryResponse,
  ReaskResponse,
} from './types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`${res.status}: ${body}`)
  }
  return res.json() as Promise<T>
}

export function postQuery(question: string, asOf?: string): Promise<QueryResponse> {
  return request('/query', {
    method: 'POST',
    body: JSON.stringify({ question, as_of: asOf || null }),
  })
}

export function getLogs(): Promise<LogEntry[]> {
  return request('/logs')
}

export function getGraph(): Promise<GraphResponse> {
  return request('/graph')
}

export function getGraphData(dataset = 'engineering_decisions'): Promise<GraphData> {
  return request(`/graph/data?dataset=${encodeURIComponent(dataset)}`)
}

export function getDatasets(): Promise<Dataset[]> {
  return request('/datasets')
}

export function getDatasetDocuments(dataset: string): Promise<DatasetDocument[]> {
  return request(`/datasets/${dataset}/documents`)
}

export function postIngest(text: string, dataset: string): Promise<IngestResponse> {
  return request('/ingest', { method: 'POST', body: JSON.stringify({ text, dataset }) })
}

export function postIngestGithub(url: string, dataset: string): Promise<IngestResponse> {
  return request('/ingest/github', { method: 'POST', body: JSON.stringify({ url, dataset }) })
}

export function getForgetPreview(dataset: string, dataId?: string): Promise<ForgetPreview> {
  const params = new URLSearchParams({ dataset })
  if (dataId) params.set('data_id', dataId)
  return request(`/forget/preview?${params.toString()}`)
}

export function postForget(dataset: string, dataId?: string): Promise<ForgetResponse> {
  return request('/forget', {
    method: 'POST',
    body: JSON.stringify({ dataset, data_id: dataId || null }),
  })
}

export function postImprove(dataset: string): Promise<ImproveResponse> {
  return request('/improve', { method: 'POST', body: JSON.stringify({ dataset }) })
}

export function postReask(recId: number): Promise<ReaskResponse> {
  return request(`/logs/${recId}/reask`, { method: 'POST' })
}

export function postResolve(recId: number): Promise<{ status: string }> {
  return request(`/logs/${recId}/resolve`, { method: 'POST' })
}
