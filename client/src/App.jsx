import { Routes, Route } from 'react-router-dom'
import AdminDashboard from './pages/AdminDashboard'
import ReviewPage from './pages/ReviewPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AdminDashboard />} />
      <Route path="/review/:token" element={<ReviewPage />} />
    </Routes>
  )
}
