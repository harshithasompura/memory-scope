import { Badge, type BadgeVariant } from './Badge'

const entries: { variant: BadgeVariant; label: string; explanation: string }[] = [
  {
    variant: 'stale',
    label: 'stale',
    explanation: 'this document is older than the freshness window and might not reflect current information',
  },
  {
    variant: 'suspect',
    label: 'suspect',
    explanation: 'this answer may be wrong because a source it relied on changed',
  },
  {
    variant: 'resolved',
    label: 'resolved',
    explanation: 'this answer was re-checked and confirmed still correct',
  },
  {
    variant: 'contradiction',
    label: 'contradiction',
    explanation: 'this document conflicts with something else already in memory',
  },
]

export function BadgeLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[#EAEAEA] px-6 py-3 text-xs text-gray-500">
      {entries.map(({ variant, label, explanation }) => (
        <span key={variant} className="flex items-center gap-1.5" title={`${label}, ${explanation}`}>
          <Badge variant={variant}>{label}</Badge>
          {explanation}
        </span>
      ))}
    </div>
  )
}
