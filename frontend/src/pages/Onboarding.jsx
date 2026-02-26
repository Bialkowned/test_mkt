import { useState, useRef } from 'react'
import axios from 'axios'

export default function Onboarding({ user, setUser }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendMsg, setResendMsg] = useState('')
  const inputRef = useRef(null)

  const handleVerifyCode = async (e) => {
    e.preventDefault()
    if (code.length !== 6) return
    setLoading(true)
    setError('')
    try {
      const { data } = await axios.post('/api/auth/verify-email-code', { code })
      setUser(data.user)
    } catch (err) {
      setError(err.response?.data?.detail || 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResendMsg('')
    setError('')
    try {
      await axios.post('/api/auth/resend-verification-code')
      setResendMsg('New code sent! Check your inbox.')
      setCode('')
    } catch (err) {
      setResendMsg(err.response?.data?.detail || 'Failed to resend')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-bold text-gray-900 text-center mb-2">Verify your email</h2>
          <p className="text-sm text-gray-500 text-center mb-6">
            We sent a 6-digit code to <span className="font-medium text-gray-700">{user.email}</span>
          </p>

          <form onSubmit={handleVerifyCode}>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full text-center text-3xl font-mono tracking-[0.4em] px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              autoFocus
            />

            {error && <p className="mt-3 text-sm text-red-600 text-center">{error}</p>}
            {resendMsg && <p className="mt-3 text-sm text-green-600 text-center">{resendMsg}</p>}

            <button
              type="submit"
              disabled={code.length !== 6 || loading}
              className="w-full mt-5 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-500">
            Didn't receive a code?{' '}
            <button onClick={handleResend} className="text-primary-600 hover:text-primary-700 font-medium">
              Resend
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
