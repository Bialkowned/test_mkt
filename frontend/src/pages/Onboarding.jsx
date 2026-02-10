import { useState, useRef } from 'react'
import axios from 'axios'

export default function Onboarding({ user, setUser }) {
  const step = !user.email_verified ? 1 : !user.github_username ? 2 : 2
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

  const handleConnectGithub = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await axios.get('/api/auth/github-oauth-url')
      window.location.href = data.url
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to start GitHub connection')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                s < step ? 'bg-green-500 text-white' :
                s === step ? 'bg-primary-600 text-white' :
                'bg-gray-200 text-gray-500'
              }`}>
                {s < step ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                ) : s}
              </div>
              {s < 2 && <div className={`w-12 h-0.5 ${s < step ? 'bg-green-500' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          {step === 1 && (
            <>
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
            </>
          )}

          {step === 2 && (
            <>
              <div className="flex justify-center mb-5">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" className="text-gray-900">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 text-center mb-2">Connect GitHub</h2>
              <p className="text-sm text-gray-500 text-center mb-6">
                {user.role === 'builder'
                  ? 'Connect your GitHub account so testers can access your repos and provide better feedback.'
                  : 'Connect your GitHub account to access project repos and submit detailed test feedback.'}
              </p>

              {error && <p className="mb-4 text-sm text-red-600 text-center">{error}</p>}

              <button
                onClick={handleConnectGithub}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium disabled:opacity-50"
              >
                {loading ? (
                  'Redirecting...'
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    Connect GitHub Account
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
