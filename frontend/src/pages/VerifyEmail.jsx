import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import axios from 'axios'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState('verifying')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setStatus('error')
      setMessage('No verification token provided.')
      return
    }
    axios.post('/api/auth/verify-email', { token })
      .then((res) => {
        setStatus('success')
        setMessage(res.data.message)
      })
      .catch((err) => {
        setStatus('error')
        setMessage(err.response?.data?.detail || 'Verification failed. The link may be expired.')
      })
  }, [searchParams])

  return (
    <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-lg shadow text-center">
      {status === 'verifying' && (
        <>
          <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Verifying your email...</p>
        </>
      )}
      {status === 'success' && (
        <>
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-green-600" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Email Verified</h2>
          <p className="text-gray-600 mb-6">{message}</p>
          <Link to="/dashboard" className="inline-block px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium">
            Go to Dashboard
          </Link>
        </>
      )}
      {status === 'error' && (
        <>
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-red-600" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Verification Failed</h2>
          <p className="text-gray-600 mb-6">{message}</p>
          <Link to="/dashboard" className="inline-block px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium">
            Go to Dashboard
          </Link>
        </>
      )}
    </div>
  )
}
