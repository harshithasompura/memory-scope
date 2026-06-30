export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-800 transition-transform">
      {message}
    </div>
  )
}
