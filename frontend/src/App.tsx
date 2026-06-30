import { Navigate, Route, Routes } from 'react-router-dom'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/ask" replace />} />
      <Route path="/ask" element={<div>Ask</div>} />
      <Route path="/graph" element={<div>Graph</div>} />
      <Route path="/lifecycle" element={<div>Lifecycle</div>} />
    </Routes>
  )
}

export default App
