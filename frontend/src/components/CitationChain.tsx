const CITATION_UNTRACKED_LABEL = 'citation untracked, cannot verify'

interface Props {
  citedChunkIds: string[]
  citedDataIds: string[]
}

/**
 * Provenance chain: answer -> cited chunks -> source data_ids. Deterministic
 * render of the exact citation fields the recall log stored, no model judgment.
 * Shared by the live Ask answer and each RecommendationRow history entry.
 */
export function CitationChain({ citedChunkIds, citedDataIds }: Props) {
  if (citedDataIds.length === 0) {
    return <p className="font-mono text-xs text-stale">{CITATION_UNTRACKED_LABEL}</p>
  }
  return (
    <div className="flex flex-wrap items-center gap-x-1 gap-y-1 font-mono text-xs text-ink/50">
      <span>answer</span>
      <span aria-hidden="true">→</span>
      <span>chunks: {citedChunkIds.length > 0 ? citedChunkIds.join(', ') : 'none'}</span>
      <span aria-hidden="true">→</span>
      <span>source: {citedDataIds.join(', ')}</span>
    </div>
  )
}

export { CITATION_UNTRACKED_LABEL }
