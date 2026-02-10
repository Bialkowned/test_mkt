import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import axios from 'axios'

export default function Settings({ user }) {
  const [searchParams] = useSearchParams()
  const [connectStatus, setConnectStatus] = useState({ onboarded: false, account_id: null })
  const [loading, setLoading] = useState(true)
  const [onboarding, setOnboarding] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchConnectStatus()
  }, [])

  const fetchConnectStatus = async () => {
    try {
      const res = await axios.get('/api/stripe/connect/status')
      setConnectStatus(res.data)
    } catch {
      // Not a tester or other error — that's fine
    } finally {
      setLoading(false)
    }
  }

  // Check if returning from Stripe onboarding
  useEffect(() => {
    if (searchParams.get('stripe') === 'success') {
      fetchConnectStatus()
    }
  }, [searchParams])

  const handleOnboard = async () => {
    setOnboarding(true)
    setError('')
    try {
      const res = await axios.post('/api/stripe/connect/onboard')
      window.location.href = res.data.url
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to start onboarding')
      setOnboarding(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-32 bg-gray-200 rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">{error}</div>}

      {user.role === 'tester' && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Payout Setup</h2>
          <p className="text-gray-500 text-sm mb-5">
            Connect your Stripe account to receive payouts when builders approve your submissions.
          </p>

          {connectStatus.onboarded ? (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-5 py-4">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-green-600" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
              <div>
                <p className="font-medium text-green-800">Payouts enabled</p>
                <p className="text-sm text-green-600">Your Stripe account is connected. You'll receive payouts automatically when submissions are approved.</p>
              </div>
            </div>
          ) : (
            <button
              onClick={handleOnboard}
              disabled={onboarding}
              className="px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50"
            >
              {onboarding ? 'Redirecting to Stripe...' : 'Set Up Payouts'}
            </button>
          )}
        </div>
      )}

      {user.role === 'builder' && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Account</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Email</span>
              <span className="text-gray-900">{user.email}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Role</span>
              <span className="text-gray-900 capitalize">{user.role}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Email Verified</span>
              <span className={user.email_verified ? 'text-green-600' : 'text-amber-600'}>
                {user.email_verified ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
