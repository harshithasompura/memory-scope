import type { BlastRadius } from '../types'
import { useCountUp } from '../hooks/useCountUp'

export function BlastRadiusSummary({ blastRadius }: { blastRadius: BlastRadius }) {
  const count = useCountUp(blastRadius.count)

  if (blastRadius.count === 0) {
    return <p className="text-sm text-gray-700">0 recommendation(s) affected</p>
  }
  return (
    <p className="text-sm text-gray-700">
      {count} recommendation(s) affected · most recent{' '}
      {new Date(blastRadius.most_recent!).toLocaleString()} · avg confidence{' '}
      {Math.round(blastRadius.avg_confidence * 100)}%
    </p>
  )
}
