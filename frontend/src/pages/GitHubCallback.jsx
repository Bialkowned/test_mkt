import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import axios from 'axios'

export default function GitHubCallback({ setUser }) {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    const code = searchParams.get('code')
    if (!code) {
      setError('No authorization code received from GitHub.')
      setTimeout(() => navigate('/'), 3000)
      return
    }

    axios.post('/api/auth/github-callback', { code })
      .then(({ data }) => {
        setUser(data.user)
        navigate('/dashboard')
      })
      .catch((err) => {
        setError(err.response?.data?.detail || 'Failed to connect GitHub account.')
        setTimeout(() => navigate('/'), 3000)
      })
  }, [searchParams, setUser, navigate])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-red-600" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </div>
          <p className="text-red-600 font-medium mb-2">{error}</p>
          <p className="text-sm text-gray-500">Redirecting...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Connecting GitHub account...</p>
      </div>
    </div>
  )
}
