import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'

export default function Register({ setUser }) {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ email: '', password: '', first_name: '', last_name: '', role: 'builder' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      setLoading(false)
      return
    }
    try {
      const response = await axios.post('/api/auth/register', formData)
      localStorage.setItem('token', response.data.access_token)
      axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.access_token}`
      setUser(response.data.user)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-12 p-8 bg-white rounded-lg shadow">
      <h2 className="text-3xl font-bold mb-6 text-center">Create Account</h2>
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-gray-700 mb-2">I want to:</label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input type="radio" value="builder" checked={formData.role === 'builder'} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="mr-2" />
              <span>Get my app tested (Builder)</span>
            </label>
            <label className="flex items-center">
              <input type="radio" value="tester" checked={formData.role === 'tester'} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="mr-2" />
              <span>Test apps and earn money (Tester)</span>
            </label>
          </div>
        </div>
        <div>
          <label className="block text-gray-700 mb-2">First Name</label>
          <input type="text" required className="w-full px-4 py-2 border rounded" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} />
        </div>
        <div>
          <label className="block text-gray-700 mb-2">Last Name</label>
          <input type="text" required className="w-full px-4 py-2 border rounded" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} />
        </div>
        <div>
          <label className="block text-gray-700 mb-2">Email</label>
          <input type="email" required className="w-full px-4 py-2 border rounded" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
        </div>
        <div>
          <label className="block text-gray-700 mb-2">Password (min 8 characters)</label>
          <input type="password" required className="w-full px-4 py-2 border rounded" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
        </div>
        <button type="submit" disabled={loading} className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 rounded font-semibold disabled:opacity-50">
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>
      <p className="mt-6 text-center text-gray-600">
        Already have an account? <Link to="/login" className="text-primary-600 hover:text-primary-700 font-semibold">Login</Link>
      </p>
    </div>
  )
}
