import { useState } from 'react'
import type { LogEntry } from '../types'
import { postReask, postResolve } from '../api'
import { useAsync } from '../hooks/useAsync'
import { Badge } from './Badge'
import { Button } from './Button'

const CITATION_UNTRACKED_LABEL = 'citation untracked — cannot verify'

interface Props {
  entry: LogEntry
  onResolved?: () => void
}

export function RecommendationRow({ entry, onResolved }: Props) {
  const [expanded, setExpanded] = useState(false)
  const reask = useAsync(() => postReask(entry.id))

  function handleResolve() {
    postResolve(entry.id).then(() => onResolved?.()).catch(() => {})
  }

  const citationUntracked = entry.cited_data_ids.length === 0

  return (
    <li className="border-b border-gray-200 py-2">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="truncate">{entry.question}</span>
        <span className="flex items-center gap-1">
          {entry.resolved && <Badge>resolved</Badge>}
          {entry.suspect && !entry.resolved && <Badge>suspect</Badge>}
        </span>
      </button>
      <div
        className={`grid overflow-hidden transition-all duration-200 ${
          expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <p className="mt-2 text-sm text-gray-700">{entry.answer_text}</p>
          <p className="mt-1 font-mono text-xs text-gray-500">
            chunks: {entry.cited_chunk_ids.join(', ') || 'none'}
          </p>
          <p className="font-mono text-xs text-gray-500">
            data: {entry.cited_data_ids.join(', ') || 'none'}
          </p>

          {/* Re-ask flow: only shown for suspect rows that are not yet resolved */}
          {entry.suspect && !entry.resolved && (
            <div className="mt-3">
              <Button
                type="button"
                variant="secondary"
                loading={reask.state.status === 'loading'}
                disabled={citationUntracked || reask.state.status === 'loading'}
                title={citationUntracked ? CITATION_UNTRACKED_LABEL : undefined}
                onClick={() => reask.run()}
              >
                {citationUntracked
                  ? CITATION_UNTRACKED_LABEL
                  : reask.state.status === 'loading'
                    ? 'Re-asking…'
                    : 'Re-ask'}
              </Button>

              {reask.state.status === 'success' && reask.state.data.changed && (
                <div className="mt-3 space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-gray-500">Old answer</p>
                      <p className="text-sm text-gray-700">{entry.answer_text}</p>
                      <p className="mt-1 font-mono text-xs text-gray-400">
                        data: {entry.cited_data_ids.join(', ') || 'none'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">New answer</p>
                      <p className="text-sm text-gray-700">{reask.state.data.new_answer}</p>
                      <p className="mt-1 font-mono text-xs text-gray-400">
                        data: {reask.state.data.new_cited_data_ids.join(', ') || 'none'}
                      </p>
                    </div>
                  </div>
                  <Button type="button" onClick={handleResolve}>
                    Mark resolved
                  </Button>
                </div>
              )}

              {reask.state.status === 'success' && !reask.state.data.changed && (
                <p className="mt-2 text-sm text-gray-500">
                  Still suspect — no correction found in memory yet.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  )
}
