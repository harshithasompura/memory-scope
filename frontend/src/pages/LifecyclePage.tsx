import { useEffect, useState, type FormEvent } from 'react'
import {
  getDatasetDocuments,
  getDatasets,
  getForgetPreview,
  postForget,
  postImprove,
  postIngest,
  postIngestGithub,
} from '../api'
import { Badge } from '../components/Badge'
import { BlastRadiusSummary } from '../components/BlastRadiusSummary'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ErrorState } from '../components/ErrorState'
import { useAsync } from '../hooks/useAsync'
import { pushToast } from '../hooks/toastSignal'
import type { ForgetResponse, GraphCounts, ImproveResponse, IngestResponse } from '../types'

const DEFAULT_DATASET = 'engineering_decisions'

function CountDelta({ before, after }: { before: GraphCounts; after: GraphCounts }) {
  return (
    <p className="mt-2 font-mono text-sm text-ink/70">
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
        <label className="mb-1 block font-mono text-xs tracking-[0.2em] text-ink/40 uppercase">
          Dataset
        </label>
        <select
          value={dataset}
          onChange={(e) => setDataset(e.target.value)}
          className="rounded-lg border border-ink/15 p-2 font-mono text-sm text-ink focus:border-accent-deep focus:outline-none"
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

const DOCUMENTS_COLLAPSE_THRESHOLD = 10

function DocumentsList({
  documents,
}: {
  documents: { id: string; name: string; stale: boolean; contradiction: boolean }[]
}) {
  const [showAll, setShowAll] = useState(false)

  if (documents.length === 0) return null

  const collapsible = documents.length > DOCUMENTS_COLLAPSE_THRESHOLD
  const visible = collapsible && !showAll ? documents.slice(0, DOCUMENTS_COLLAPSE_THRESHOLD) : documents

  return (
    <Card>
      <h2 className="mb-2 font-mono text-xs tracking-[0.2em] text-ink/40 uppercase">Documents</h2>
      <ul className="space-y-1">
        {visible.map((doc) => (
          <li key={doc.id} className="flex items-center gap-2 text-sm">
            <span>{doc.name}</span>
            {doc.stale && <Badge variant="stale">stale</Badge>}
            {doc.contradiction && <Badge variant="contradiction">contradiction</Badge>}
          </li>
        ))}
      </ul>
      {collapsible && !showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-2 cursor-pointer font-mono text-xs text-accent hover:underline"
        >
          show all ({documents.length})
        </button>
      )}
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
      <h2 className="mb-2 font-mono text-xs tracking-[0.2em] text-ink/40 uppercase">Remember</h2>
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
          className="w-full rounded-lg border border-ink/15 p-2 text-sm text-ink focus:border-accent-deep focus:outline-none"
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
          className="w-full rounded-lg border border-ink/15 p-2 text-sm text-ink focus:border-accent-deep focus:outline-none"
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
      {result?.contradiction && (
        <p className="mt-2 text-sm text-suspect">Contradiction detected: {result.contradiction.reason}</p>
      )}
    </Card>
  )
}

function ForgetForm({ dataset }: { dataset: string }) {
  const [dataId, setDataId] = useState('')
  const [confirming, setConfirming] = useState(false)
  const preview = useAsync(getForgetPreview)
  const forget = useAsync(postForget)
  const result: ForgetResponse | null = forget.state.status === 'success' ? forget.state.data : null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    try {
      await preview.run(dataset, dataId.trim() || undefined)
      setConfirming(true)
    } catch {
      // surfaced via preview.state.status === 'error' below
    }
  }

  async function handleConfirm() {
    try {
      const data = await forget.run(dataset, dataId.trim() || undefined)
      setConfirming(false)
      pushToast(`forget completed, ${data.flagged_count} recommendation(s) now flagged suspect`)
    } catch {
      setConfirming(false)
    }
  }

  return (
    <Card>
      <h2 className="mb-2 font-mono text-xs tracking-[0.2em] text-ink/40 uppercase">Forget</h2>
      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          type="text"
          value={dataId}
          onChange={(e) => setDataId(e.target.value)}
          placeholder="data_id (optional, leave empty to wipe full dataset)"
          className="w-full rounded-lg border border-ink/15 p-2 text-sm text-ink focus:border-accent-deep focus:outline-none"
          disabled={preview.state.status === 'loading'}
        />
        <Button type="submit" variant="secondary" loading={preview.state.status === 'loading'}>
          Forget
        </Button>
      </form>

      {preview.state.status === 'error' && <ErrorState message={preview.state.error} />}
      {forget.state.status === 'error' && <ErrorState message={forget.state.error} />}
      {result && (
        <>
          <BlastRadiusSummary blastRadius={result.blast_radius} />
          <CountDelta before={result.counts_before} after={result.counts_after} />
        </>
      )}

      {confirming && preview.state.status === 'success' && (
        <ConfirmDialog
          title="Confirm forget"
          onCancel={() => setConfirming(false)}
          onConfirm={handleConfirm}
          confirmLabel="Yes, forget"
          confirmLoading={forget.state.status === 'loading'}
        >
          {'data_id' in preview.state.data ? (
            <BlastRadiusSummary blastRadius={preview.state.data} />
          ) : (
            <p className="text-sm text-ink/70">
              This wipes the entire dataset. {preview.state.data.document_count} document(s) will be
              removed.
            </p>
          )}
        </ConfirmDialog>
      )}
    </Card>
  )
}

function ImproveForm({ dataset }: { dataset: string }) {
  const improve = useAsync(postImprove)
  const result: ImproveResponse | null = improve.state.status === 'success' ? improve.state.data : null

  return (
    <Card>
      <h2 className="mb-2 font-mono text-xs tracking-[0.2em] text-ink/40 uppercase">Improve</h2>
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
