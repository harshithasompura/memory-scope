import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AskPage } from './pages/AskPage'
import { GraphPage } from './pages/GraphPage'
import { LifecyclePage } from './pages/LifecyclePage'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/ask" replace />} />
        <Route path="/ask" element={<AskPage />} />
        <Route path="/graph" element={<GraphPage />} />
        <Route path="/lifecycle" element={<LifecyclePage />} />
      </Routes>
    </Layout>
  )
}

export default App
