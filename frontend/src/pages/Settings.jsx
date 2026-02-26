import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import axios from 'axios'

const SECTIONS = {
  tester: ['profile', 'payouts', 'account'],
  builder: ['account'],
}

function SideNav({ items, active, onSelect }) {
  const labels = { profile: 'Profile', payouts: 'Payouts', account: 'Account' }
  const icons = {
    profile: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
    payouts: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
    account: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  }

  return (
    <nav className="space-y-0.5">
      {items.map((key) => (
        <button
          key={key}
          onClick={() => onSelect(key)}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            active === key
              ? 'bg-gray-900 text-white'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          {icons[key]}
          {labels[key]}
        </button>
      ))}
    </nav>
  )
}

export default function Settings({ user }) {
  const [searchParams] = useSearchParams()
  const [connectStatus, setConnectStatus] = useState({ onboarded: false, account_id: null })
  const [loading, setLoading] = useState(true)
  const [onboarding, setOnboarding] = useState(false)
  const [error, setError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState('')
  const [section, setSection] = useState(SECTIONS[user.role]?.[0] || 'account')

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
      <div className="px-6 lg:px-10 py-10 max-w-[1100px] mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-6 bg-gray-100 rounded w-32" />
          <div className="h-64 bg-gray-100 rounded-xl" />
        </div>
      </div>
    )
  }

  const initials = `${(user.first_name || '')[0] || ''}${(user.last_name || '')[0] || ''}`.toUpperCase()
  const sections = SECTIONS[user.role] || ['account']

  return (
    <div className="px-6 lg:px-10 py-10 max-w-[1100px] mx-auto">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-400 text-sm mt-1">Manage your account, profile, and payout preferences.</p>
      </div>

      {/* Toasts */}
      {error && (
        <div className="mb-6 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
          {error}
        </div>
      )}
      {profileSuccess && (
        <div className="mb-6 flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-lg">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {profileSuccess}
        </div>
      )}

      <div className="flex gap-8">
        {/* Sidebar */}
        <div className="w-48 shrink-0 hidden md:block">
          {/* Identity card */}
          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
            <div className="w-9 h-9 rounded-full bg-gray-900 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-white">{initials}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{user.first_name} {user.last_name}</p>
              <p className="text-xs text-gray-400 capitalize">{user.role}</p>
            </div>
          </div>
          <SideNav items={sections} active={section} onSelect={setSection} />
        </div>

        {/* Mobile nav */}
        <div className="md:hidden w-full mb-6">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
            {sections.map((key) => (
              <button
                key={key}
                onClick={() => setSection(key)}
                className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md capitalize transition-all ${
                  section === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                }`}
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Profile Section */}
          {section === 'profile' && user.role === 'tester' && (
            <div className="space-y-6">
              {/* Public profile link */}
              {user.public_slug && (
                <div className="flex items-center justify-between bg-gray-50 rounded-xl px-5 py-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Public profile</p>
                    <p className="text-xs text-gray-400 mt-0.5">Visible to builders when you bid or submit work.</p>
                  </div>
                  <Link
                    to={`/testers/${user.public_slug}`}
                    className="text-sm font-medium text-gray-900 hover:text-gray-600 transition-colors"
                  >
                    View &rarr;
                  </Link>
                </div>
              )}

              {/* Bio */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-900">Bio</h2>
                  <p className="text-xs text-gray-400 mt-0.5">A short description of your testing experience and approach.</p>
                </div>
                <div className="px-5 py-4">
                  <textarea
                    rows={4}
                    maxLength={500}
                    placeholder="I specialize in testing SaaS products with a focus on edge cases and accessibility..."
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900 placeholder:text-gray-300 resize-none transition-shadow"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                  />
                  <div className="flex justify-end mt-1.5">
                    <span className={`text-xs tabular-nums ${bio.length > 450 ? 'text-amber-500' : 'text-gray-300'}`}>{bio.length}/500</span>
                  </div>
                </div>
              </div>

              {/* Specialties */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-900">Specialties</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Tags that describe what you're best at testing. Max 10.</p>
                </div>
                <div className="px-5 py-4">
                  {specialties.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {specialties.map((s) => (
                        <span key={s} className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-md">
                          {s}
                          <button
                            onClick={() => handleRemoveSpecialty(s)}
                            className="text-gray-400 hover:text-gray-600 p-0.5 rounded hover:bg-gray-200 transition-colors"
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <input
                    type="text"
                    placeholder={specialties.length >= 10 ? 'Maximum reached' : 'Type and press Enter — e.g. E-commerce, SaaS, Mobile'}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900 placeholder:text-gray-300 disabled:bg-gray-50 disabled:text-gray-400 transition-shadow"
                    value={specialtiesInput}
                    onChange={(e) => setSpecialtiesInput(e.target.value)}
                    onKeyDown={handleAddSpecialty}
                    disabled={specialties.length >= 10}
                  />
                </div>
              </div>

              {/* Visibility toggle */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">Profile visibility</h2>
                    <p className="text-xs text-gray-400 mt-0.5">When off, your profile won't appear in the public tester directory.</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={profileVisible}
                    onClick={() => setProfileVisible(!profileVisible)}
                    className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${profileVisible ? 'bg-gray-900' : 'bg-gray-200'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${profileVisible ? 'translate-x-5' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Save */}
              <div className="flex justify-end">
                <button
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="px-5 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 font-medium disabled:opacity-50 transition-colors"
                >
                  {savingProfile ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </div>
          )}

          {/* Payouts Section */}
          {section === 'payouts' && user.role === 'tester' && (
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-900">Stripe Connect</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Connect your bank account to receive payouts when builders approve your work.</p>
                </div>

                <div className="px-5 py-5">
                  {connectStatus.onboarded ? (
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-emerald-600" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Connected</p>
                        <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                          Your Stripe account is active. Payouts are sent automatically when a builder approves your submission. Funds typically arrive in 2-3 business days.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-gray-400" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">Not connected</p>
                        <p className="text-xs text-gray-400 mt-0.5 mb-4 leading-relaxed">
                          Set up a Stripe account to receive payouts. You'll be redirected to Stripe to verify your identity and bank details. Takes about 5 minutes.
                        </p>
                        <button
                          onClick={handleOnboard}
                          disabled={onboarding}
                          className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 font-medium disabled:opacity-50 transition-colors"
                        >
                          {onboarding ? 'Redirecting...' : 'Connect Stripe'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Payout info */}
              <div className="bg-gray-50 rounded-xl px-5 py-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">How payouts work</h3>
                <ul className="space-y-2 text-xs text-gray-500 leading-relaxed">
                  <li className="flex gap-2">
                    <span className="text-gray-300 font-bold">1.</span>
                    Complete a test submission and submit your work.
                  </li>
                  <li className="flex gap-2">
                    <span className="text-gray-300 font-bold">2.</span>
                    The builder reviews your submission and approves it.
                  </li>
                  <li className="flex gap-2">
                    <span className="text-gray-300 font-bold">3.</span>
                    Payment is released to your Stripe account automatically.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Account Section */}
          {section === 'account' && (
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-900">Account details</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Your account information and verification status.</p>
                </div>
                <div className="divide-y divide-gray-100">
                  <div className="px-5 py-3.5 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-400">Full name</p>
                      <p className="text-sm font-medium text-gray-900 mt-0.5">{user.first_name} {user.last_name}</p>
                    </div>
                  </div>
                  <div className="px-5 py-3.5 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-400">Email</p>
                      <p className="text-sm font-medium text-gray-900 mt-0.5">{user.email}</p>
                    </div>
                    {user.email_verified ? (
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Verified</span>
                    ) : (
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded">Unverified</span>
                    )}
                  </div>
                  <div className="px-5 py-3.5 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-400">Role</p>
                      <p className="text-sm font-medium text-gray-900 mt-0.5 capitalize">{user.role}</p>
                    </div>
                  </div>
                  {user.public_slug && (
                    <div className="px-5 py-3.5 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-400">Profile slug</p>
                        <p className="text-sm font-mono text-gray-500 mt-0.5">{user.public_slug}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Danger zone placeholder */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-900">Sessions</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Manage your active sessions.</p>
                </div>
                <div className="px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Current session</p>
                      <p className="text-xs text-gray-400">Active now</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
