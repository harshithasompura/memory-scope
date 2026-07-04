import { useEffect, useState } from 'react'
import { getLogs, postQuery } from '../api'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { ErrorState } from '../components/ErrorState'
import { RecommendationRow } from '../components/RecommendationRow'
import { useAsync } from '../hooks/useAsync'

export function AskPage() {
  const [question, setQuestion] = useState('')
  const [asOf, setAsOf] = useState('')
  const ask = useAsync(postQuery)
  const fetchLogs = useAsync(getLogs)
  const logs = fetchLogs.state.status === 'success' ? fetchLogs.state.data : []

  useEffect(() => {
    fetchLogs.run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    ask
      .run(question, asOf || undefined)
      .then(() => fetchLogs.run())
      .catch(() => {})
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question..."
          className="w-full rounded-lg border border-ink/15 p-3 text-sm text-ink focus:border-accent-deep focus:outline-none focus:ring-2 focus:ring-accent/30"
          rows={3}
        />
        <div className="flex items-center gap-2">
          <label htmlFor="as-of" className="font-mono text-xs tracking-wide text-ink/50 uppercase">
            As of
          </label>
          <input
            id="as-of"
            type="datetime-local"
            value={asOf}
            onChange={(e) => setAsOf(e.target.value)}
            className="rounded-lg border border-ink/15 px-2 py-1 font-mono text-xs text-ink focus:border-accent-deep focus:outline-none"
          />
        </div>
        <Button type="submit" loading={ask.state.status === 'loading'} disabled={!question.trim()}>
          {ask.state.status === 'loading' ? 'Thinking...' : 'Ask'}
        </Button>
      </form>

      {ask.state.status === 'error' && <ErrorState message={ask.state.error} />}
      {ask.state.status === 'success' && (
        <Card>
          <p className="text-sm">{ask.state.data.answer}</p>
        </Card>
      )}

      <div>
        <h2 className="mb-3 font-mono text-xs tracking-[0.2em] text-ink/40 uppercase">
          Recommendation history
        </h2>
        {logs.length === 0 ? (
          <p className="text-sm text-ink/50">No recommendations yet. Ask a question to get started.</p>
        ) : (
          <ul>
            {logs.map((entry) => (
              <RecommendationRow key={entry.id} entry={entry} onResolved={() => fetchLogs.run()} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
