import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AskPage } from './pages/AskPage'
import { GraphPage } from './pages/GraphPage'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/ask" replace />} />
        <Route path="/ask" element={<AskPage />} />
        <Route path="/graph" element={<GraphPage />} />
        <Route path="/lifecycle" element={<div>Lifecycle</div>} />
      </Routes>
    </Layout>
  )
}

export default App
