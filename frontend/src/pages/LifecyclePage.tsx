import { useEffect, useState } from 'react'
import { getDatasets, postForget, postImprove, postIngest, postIngestGithub } from '../api'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { ErrorState } from '../components/ErrorState'
import { useAsync } from '../hooks/useAsync'
import type { ForgetResponse, GraphCounts, ImproveResponse, IngestResponse } from '../types'

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

  useEffect(() => {
    datasets.run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    </div>
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
          <p className="text-sm text-gray-700">{result.flagged_count} recommendation(s) affected</p>
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
