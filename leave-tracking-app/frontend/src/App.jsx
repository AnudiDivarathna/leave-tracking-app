import { BrowserRouter, Routes, Route } from 'react-router-dom'
import axios from 'axios'
import PublicDashboard from './pages/PublicDashboard'
import AdminDashboard from './pages/AdminDashboard'

// Set base URL for API - use environment variable or default to empty string for same-origin
axios.defaults.baseURL = import.meta.env.VITE_API_URL || ''

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Routes>
          <Route path="/" element={<PublicDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
