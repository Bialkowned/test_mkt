import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import { setAccessToken } from '../api'

export default function Login({ setUser }) {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const response = await axios.post('/api/auth/login', formData)
      setAccessToken(response.data.access_token)
      setUser(response.data.user)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-lg shadow">
      <h2 className="text-3xl font-bold mb-6 text-center">Login</h2>
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-gray-700 mb-2">Email</label>
          <input type="email" required className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-primary-500" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
        </div>
        <div>
          <label className="block text-gray-700 mb-2">Password</label>
          <input type="password" required className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-primary-500" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
        </div>
        <button type="submit" disabled={loading} className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 rounded font-semibold disabled:opacity-50">
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      <p className="mt-6 text-center text-gray-600">
        Don't have an account? <Link to="/register" className="text-primary-600 hover:text-primary-700 font-semibold">Sign up</Link>
      </p>
    </div>
  )
}
