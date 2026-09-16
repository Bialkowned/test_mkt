import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import { setAccessToken } from '../api'

export default function Register({ setUser }) {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ email: '', password: '', first_name: '', last_name: '', role: 'builder' })
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      setLoading(false)
      return
    }
    if (formData.password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }
    try {
      const response = await axios.post('/api/auth/register', formData)
      setAccessToken(response.data.access_token)
      setUser(response.data.user)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const roles = [
    { value: 'builder', label: 'Builder', desc: 'Get my app tested' },
    { value: 'tester', label: 'Tester', desc: 'Test apps & earn' },
  ]

  return (
    <div className="min-h-[calc(100vh-4rem)] flex">
      {/* Left panel — brand */}
      <div className="hidden lg:flex lg:w-[45%] bg-primary-600 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.08]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-primary-900 rounded-full blur-[140px] opacity-40 translate-y-1/3 translate-x-1/4" />

        <div className="relative flex flex-col justify-center px-12 xl:px-16">
          <h2 className="text-3xl font-bold text-white leading-tight mb-4">
            Join a marketplace built for
            <span className="text-primary-200"> indie builders & testers.</span>
          </h2>
          <p className="text-primary-100 leading-relaxed mb-10">
            Post a test job in minutes and get structured feedback from real users — or start earning by testing other people's apps.
          </p>

          {/* Feature highlights */}
          <div className="space-y-4">
            {[
              { icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', text: 'Structured bug reports & usability scores' },
              { icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', text: 'Real payments — testers get the full payout' },
              { icon: 'M13 10V3L4 14h7v7l9-11h-7z', text: 'Most jobs get claimed within hours' },
            ].map((f) => (
              <div key={f.text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={f.icon} /></svg>
                </div>
                <span className="text-sm text-white/90">{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-10 bg-white">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-gray-900">Create your account</h1>
            <p className="mt-1 text-sm text-gray-500">Start testing or get your app tested in minutes.</p>
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-2 rounded-md bg-red-50 px-3 py-2.5 text-sm text-red-700">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Role */}
            <fieldset>
              <legend className="block text-sm font-medium text-gray-700 mb-1.5">I want to</legend>
              <div className="grid grid-cols-2 gap-2">
                {roles.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, role: r.value })}
                    className={`relative rounded-md border px-3 py-2.5 text-left text-sm transition-colors ${
                      formData.role === r.value
                        ? 'border-primary-600 bg-primary-50 ring-1 ring-primary-600'
                        : 'border-gray-300 bg-white hover:border-gray-400'
                    }`}
                  >
                    <span className={`font-medium ${formData.role === r.value ? 'text-primary-700' : 'text-gray-900'}`}>{r.label}</span>
                    <span className={`block text-xs mt-0.5 ${formData.role === r.value ? 'text-primary-600' : 'text-gray-500'}`}>{r.desc}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Name */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">First name</label>
                <input
                  type="text"
                  required
                  autoComplete="given-name"
                  className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Last name</label>
                <input
                  type="text"
                  required
                  autoComplete="family-name"
                  className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            {/* Password + Confirm */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-gray-700">Password</label>
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-xs font-medium text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  placeholder="8+ characters"
                  className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <div className="mt-6 border-t border-gray-200 pt-5">
            <p className="text-center text-sm text-gray-500">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
