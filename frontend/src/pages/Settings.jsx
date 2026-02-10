import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import axios from 'axios'

export default function Settings({ user }) {
  const [searchParams] = useSearchParams()
  const [connectStatus, setConnectStatus] = useState({ onboarded: false, account_id: null })
  const [loading, setLoading] = useState(true)
  const [onboarding, setOnboarding] = useState(false)
  const [error, setError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState('')

  // Profile state for testers
  const [bio, setBio] = useState(user.bio || '')
  const [specialtiesInput, setSpecialtiesInput] = useState('')
  const [specialties, setSpecialties] = useState(user.specialties || [])
  const [profileVisible, setProfileVisible] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)

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

  const handleAddSpecialty = (e) => {
    if (e.key === 'Enter' && specialtiesInput.trim() && specialties.length < 10) {
      e.preventDefault()
      const tag = specialtiesInput.trim()
      if (!specialties.includes(tag)) {
        setSpecialties([...specialties, tag])
      }
      setSpecialtiesInput('')
    }
  }

  const handleRemoveSpecialty = (tag) => {
    setSpecialties(specialties.filter((s) => s !== tag))
  }

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    setError('')
    setProfileSuccess('')
    try {
      await axios.put('/api/profile', { bio, specialties, profile_visible: profileVisible })
      setProfileSuccess('Profile saved')
      setTimeout(() => setProfileSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save profile')
    } finally {
      setSavingProfile(false)
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
      {profileSuccess && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">{profileSuccess}</div>}

      {user.role === 'tester' && (
        <>
          {/* Profile Section */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Profile</h2>
              {user.github_username && (
                <Link
                  to={`/testers/${user.github_username}`}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  View public profile
                </Link>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                <textarea
                  rows={3}
                  maxLength={500}
                  placeholder="Tell builders about your testing experience..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
                <p className="text-xs text-gray-400 mt-1">{bio.length}/500</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Specialties</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {specialties.map((s) => (
                    <span key={s} className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-50 text-primary-700 text-xs font-medium rounded-full">
                      {s}
                      <button onClick={() => handleRemoveSpecialty(s)} className="text-primary-400 hover:text-primary-600">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Type a specialty and press Enter (e.g. E-commerce, SaaS)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={specialtiesInput}
                  onChange={(e) => setSpecialtiesInput(e.target.value)}
                  onKeyDown={handleAddSpecialty}
                  disabled={specialties.length >= 10}
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={profileVisible}
                  onClick={() => setProfileVisible(!profileVisible)}
                  className={`relative w-10 h-6 rounded-full transition-colors ${profileVisible ? 'bg-primary-600' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${profileVisible ? 'translate-x-4' : ''}`} />
                </button>
                <span className="text-sm text-gray-700">Profile visible to the public</span>
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50"
              >
                {savingProfile ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>

          {/* Payout Setup */}
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
        </>
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
