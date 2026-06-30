export function Badge({ children }: { children: string }) {
  return (
    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
      {children}
    </span>
  )
}
