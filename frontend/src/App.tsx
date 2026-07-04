import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { LandingPage } from './pages/LandingPage'
import { AskPage } from './pages/AskPage'
import { GraphPage } from './pages/GraphPage'
import { LifecyclePage } from './pages/LifecyclePage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route element={<Layout />}>
        <Route path="/ask" element={<AskPage />} />
        <Route path="/graph" element={<GraphPage />} />
        <Route path="/lifecycle" element={<LifecyclePage />} />
      </Route>
    </Routes>
  )
}

export default App
