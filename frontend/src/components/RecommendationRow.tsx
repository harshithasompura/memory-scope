import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { LogEntry } from '../types'
import { postReask, postResolve } from '../api'
import { useAsync } from '../hooks/useAsync'
import { Badge } from './Badge'
import { Button } from './Button'
import { CitationChain, CITATION_UNTRACKED_LABEL } from './CitationChain'

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
    <li className="border-b border-ink/10 py-2">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="truncate">{entry.question}</span>
        <span className="flex items-center gap-2">
          {entry.resolved && <Badge variant="resolved">resolved</Badge>}
          {entry.suspect && !entry.resolved && <Badge variant="suspect">suspect</Badge>}
          <ChevronDown
            size={16}
            className={`shrink-0 text-ink/30 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          />
        </span>
      </button>
      <div
        className={`grid overflow-hidden transition-all duration-200 ${
          expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <p className="mt-2 text-sm text-ink/70">{entry.answer_text}</p>

          <div className="mt-2">
            <CitationChain
              citedChunkIds={entry.cited_chunk_ids}
              citedDataIds={entry.cited_data_ids}
            />
          </div>

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
                      <p className="font-mono text-xs tracking-wide text-ink/40 uppercase">Old answer</p>
                      <p className="mt-1 text-sm text-ink/70">{entry.answer_text}</p>
                      <p className="mt-1 font-mono text-xs text-ink/40">
                        data: {entry.cited_data_ids.join(', ') || 'none'}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-xs tracking-wide text-resolved uppercase">New answer</p>
                      <p className="mt-1 text-sm text-ink/70">{reask.state.data.new_answer}</p>
                      <p className="mt-1 font-mono text-xs text-ink/40">
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
                <p className="mt-2 text-sm text-ink/50">
                  Still suspect. No correction found in memory yet.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  )
}
