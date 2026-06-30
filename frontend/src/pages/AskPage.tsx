import { useEffect, useState } from 'react'
import { getLogs, postQuery } from '../api'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { ErrorState } from '../components/ErrorState'
import { RecommendationRow } from '../components/RecommendationRow'
import { useAsync } from '../hooks/useAsync'

export function AskPage() {
  const [question, setQuestion] = useState('')
  const ask = useAsync(postQuery)
  const fetchLogs = useAsync(getLogs)
  const logs = fetchLogs.state.status === 'success' ? fetchLogs.state.data : []

  useEffect(() => {
    fetchLogs.run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    ask.run(question).then(() => fetchLogs.run()).catch(() => {})
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question..."
          className="w-full rounded border border-gray-300 p-2 text-sm"
          rows={3}
        />
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
        <h2 className="mb-2 text-sm font-medium text-gray-700">Recommendation history</h2>
        {logs.length === 0 ? (
          <p className="text-sm text-gray-500">No recommendations yet — ask a question to get started.</p>
        ) : (
          <ul>
            {logs.map((entry) => (
              <RecommendationRow key={entry.id} entry={entry} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
