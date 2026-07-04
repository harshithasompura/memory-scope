export type BadgeVariant = 'stale' | 'suspect' | 'resolved' | 'contradiction'

const variantClasses: Record<BadgeVariant, string> = {
  stale: 'bg-stale/10 text-stale',
  suspect: 'bg-suspect/10 text-suspect',
  resolved: 'bg-resolved/10 text-resolved',
  contradiction: 'bg-contradiction/10 text-contradiction',
}

export function Badge({
  children,
  variant = 'suspect',
}: {
  children: string
  variant?: BadgeVariant
}) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-wider uppercase ${variantClasses[variant]}`}
    >
      {children}
    </span>
  )
}
