import { useState } from 'react'
import type { LogEntry } from '../types'
import { Badge } from './Badge'

export function RecommendationRow({ entry }: { entry: LogEntry }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <li className="border-b border-gray-200 py-2">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="truncate">{entry.question}</span>
        {entry.suspect && <Badge>suspect</Badge>}
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
        </div>
      </div>
    </li>
  )
}
