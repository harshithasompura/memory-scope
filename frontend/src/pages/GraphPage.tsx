import { useEffect } from 'react'
import { getGraph } from '../api'
import { ErrorState } from '../components/ErrorState'
import { useAsync } from '../hooks/useAsync'

export function GraphPage() {
  const graph = useAsync(getGraph)

  useEffect(() => {
    graph.run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div>
      {graph.state.status === 'loading' && (
        <div className="flex h-[600px] items-center justify-center rounded border border-gray-200 bg-gray-100 text-sm text-gray-500">
          Loading graph...
        </div>
      )}
      {graph.state.status === 'error' && <ErrorState message={graph.state.error} />}
      {graph.state.status === 'success' && (
        <iframe
          title="Memory graph"
          srcDoc={graph.state.data.html}
          className="h-[600px] w-full rounded border border-gray-200"
        />
      )}
    </div>
  )
}
