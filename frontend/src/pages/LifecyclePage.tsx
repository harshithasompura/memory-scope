import { useEffect, useState } from 'react'
import {
  getDatasetDocuments,
  getDatasets,
  postForget,
  postImprove,
  postIngest,
  postIngestGithub,
} from '../api'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { ErrorState } from '../components/ErrorState'
import { useAsync } from '../hooks/useAsync'
import type { BlastRadius, ForgetResponse, GraphCounts, ImproveResponse, IngestResponse } from '../types'

const DEFAULT_DATASET = 'engineering_decisions'

function CountDelta({ before, after }: { before: GraphCounts; after: GraphCounts }) {
  return (
    <p className="text-sm text-gray-700">
      nodes: {before.num_nodes} → {after.num_nodes}, edges: {before.num_edges} → {after.num_edges}
    </p>
  )
}

export function LifecyclePage() {
  const [dataset, setDataset] = useState(DEFAULT_DATASET)
  const datasets = useAsync(getDatasets)
  const documents = useAsync(getDatasetDocuments)

  useEffect(() => {
    datasets.run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    documents.run(dataset)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataset])

  const datasetNames =
    datasets.state.status === 'success' && datasets.state.data.length > 0
      ? datasets.state.data.map((d) => d.name)
      : [DEFAULT_DATASET]

  return (
    <div className="space-y-6">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Dataset</label>
        <select
          value={dataset}
          onChange={(e) => setDataset(e.target.value)}
          className="rounded border border-gray-300 p-2 text-sm"
        >
          {datasetNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <RememberForm dataset={dataset} />
      <ForgetForm dataset={dataset} />
      <ImproveForm dataset={dataset} />
      <DocumentsList documents={documents.state.status === 'success' ? documents.state.data : []} />
    </div>
  )
}

function DocumentsList({ documents }: { documents: { id: string; name: string; stale: boolean }[] }) {
  if (documents.length === 0) return null
  return (
    <Card>
      <h2 className="mb-2 text-sm font-medium text-gray-700">Documents</h2>
      <ul className="space-y-1">
        {documents.map((doc) => (
          <li key={doc.id} className="flex items-center gap-2 text-sm">
            <span>{doc.name}</span>
            {doc.stale && <Badge>stale</Badge>}
          </li>
        ))}
      </ul>
    </Card>
  )
}

function RememberForm({ dataset }: { dataset: string }) {
  const [text, setText] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const ingest = useAsync(postIngest)
  const ingestGithub = useAsync(postIngestGithub)

  const busy = ingest.state.status === 'loading' || ingestGithub.state.status === 'loading'
  const result: IngestResponse | null =
    ingest.state.status === 'success'
      ? ingest.state.data
      : ingestGithub.state.status === 'success'
        ? ingestGithub.state.data
        : null
  const error = ingest.state.status === 'error' ? ingest.state.error : ingestGithub.state.status === 'error' ? ingestGithub.state.error : null

  return (
    <Card>
      <h2 className="mb-2 text-sm font-medium text-gray-700">Remember</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (text.trim()) ingest.run(text, dataset)
        }}
        className="mb-3 space-y-2"
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste text to ingest..."
          className="w-full rounded border border-gray-300 p-2 text-sm"
          rows={3}
          disabled={busy}
        />
        <Button type="submit" loading={ingest.state.status === 'loading'} disabled={busy || !text.trim()}>
          Ingest text
        </Button>
      </form>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (githubUrl.trim()) ingestGithub.run(githubUrl, dataset)
        }}
        className="space-y-2"
      >
        <input
          type="text"
          value={githubUrl}
          onChange={(e) => setGithubUrl(e.target.value)}
          placeholder="https://github.com/owner/repo/issues/1"
          className="w-full rounded border border-gray-300 p-2 text-sm"
          disabled={busy}
        />
        <Button
          type="submit"
          variant="secondary"
          loading={ingestGithub.state.status === 'loading'}
          disabled={busy || !githubUrl.trim()}
        >
          Ingest GitHub URL
        </Button>
      </form>

      {error && <ErrorState message={error} />}
      {result && <CountDelta before={result.counts_before} after={result.counts_after} />}
    </Card>
  )
}

function BlastRadiusSummary({ blastRadius }: { blastRadius: BlastRadius }) {
  if (blastRadius.count === 0) {
    return <p className="text-sm text-gray-700">0 recommendation(s) affected</p>
  }
  return (
    <p className="text-sm text-gray-700">
      {blastRadius.count} recommendation(s) affected · most recent{' '}
      {new Date(blastRadius.most_recent!).toLocaleString()} · avg confidence{' '}
      {Math.round(blastRadius.avg_confidence * 100)}%
    </p>
  )
}

function ForgetForm({ dataset }: { dataset: string }) {
  const [dataId, setDataId] = useState('')
  const forget = useAsync(postForget)
  const result: ForgetResponse | null = forget.state.status === 'success' ? forget.state.data : null

  return (
    <Card>
      <h2 className="mb-2 text-sm font-medium text-gray-700">Forget</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          forget.run(dataset, dataId.trim() || undefined)
        }}
        className="space-y-2"
      >
        <input
          type="text"
          value={dataId}
          onChange={(e) => setDataId(e.target.value)}
          placeholder="data_id (optional — leave empty to wipe full dataset)"
          className="w-full rounded border border-gray-300 p-2 text-sm"
          disabled={forget.state.status === 'loading'}
        />
        <Button type="submit" variant="secondary" loading={forget.state.status === 'loading'}>
          Forget
        </Button>
      </form>

      {forget.state.status === 'error' && <ErrorState message={forget.state.error} />}
      {result && (
        <>
          <BlastRadiusSummary blastRadius={result.blast_radius} />
          <CountDelta before={result.counts_before} after={result.counts_after} />
        </>
      )}
    </Card>
  )
}

function ImproveForm({ dataset }: { dataset: string }) {
  const improve = useAsync(postImprove)
  const result: ImproveResponse | null = improve.state.status === 'success' ? improve.state.data : null

  return (
    <Card>
      <h2 className="mb-2 text-sm font-medium text-gray-700">Improve</h2>
      <Button
        type="button"
        loading={improve.state.status === 'loading'}
        onClick={() => improve.run(dataset)}
      >
        Improve
      </Button>

      {improve.state.status === 'error' && <ErrorState message={improve.state.error} />}
      {result && <CountDelta before={result.counts_before} after={result.counts_after} />}
    </Card>
  )
}
