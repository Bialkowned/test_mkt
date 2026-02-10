import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { setAccessToken, setOnAuthFailure, tryRefresh } from './api'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import Jobs from './pages/Jobs'
import JobDetail from './pages/JobDetail'
import VerifyEmail from './pages/VerifyEmail'
import Settings from './pages/Settings'

function ChatBubble() {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)

  const handleSend = (e) => {
    e.preventDefault()
    if (!message.trim()) return
    setSent(true)
    setMessage('')
    setTimeout(() => setSent(false), 3000)
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open && (
        <div className="mb-3 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="bg-primary-600 px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-white font-semibold text-sm">PeerTest Support</p>
              <p className="text-primary-200 text-xs">We typically reply within a few hours</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-primary-200 hover:text-white">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
          <div className="px-5 py-4">
            {sent ? (
              <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">
                Message sent! We'll get back to you soon.
              </div>
            ) : (
              <form onSubmit={handleSend} className="space-y-3">
                <p className="text-sm text-gray-600">Have a question or running into an issue? Drop us a message.</p>
                <textarea
                  rows={3}
                  placeholder="Type your message..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50"
                  disabled={!message.trim()}
                >
                  Send Message
                </button>
              </form>
            )}
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        className="w-14 h-14 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105"
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
        )}
      </button>
    </div>
  )
}

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [resending, setResending] = useState(false)
  const [resendMsg, setResendMsg] = useState('')

  useEffect(() => {
    setOnAuthFailure(() => setUser(null))
    tryRefresh().then((data) => {
      if (data) setUser(data.user)
      setLoading(false)
    })
  }, [])

  const handleLogout = async () => {
    try {
      await axios.post('/api/auth/logout')
    } catch {
      // Logout endpoint may fail if token already expired — that's fine
    }
    setAccessToken(null)
    setUser(null)
  }

  const handleResendVerification = async () => {
    setResending(true)
    setResendMsg('')
    try {
      await axios.post('/api/auth/resend-verification')
      setResendMsg('Verification email sent!')
    } catch (err) {
      setResendMsg(err.response?.data?.detail || 'Failed to send')
    } finally {
      setResending(false)
      setTimeout(() => setResendMsg(''), 5000)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {/* Navigation */}
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <Link to="/" className="text-2xl font-bold text-primary-600">
                  PeerTest Hub
                </Link>
                {user && (
                  <div className="ml-10 flex space-x-4">
                    <Link to="/dashboard" className="text-gray-700 hover:text-gray-900 px-3 py-2">
                      Dashboard
                    </Link>
                    {user.role === 'builder' && (
                      <>
                        <Link to="/projects" className="text-gray-700 hover:text-gray-900 px-3 py-2">
                          Projects
                        </Link>
                        <Link to="/jobs" className="text-gray-700 hover:text-gray-900 px-3 py-2">
                          My Jobs
                        </Link>
                      </>
                    )}
                    {user.role === 'tester' && (
                      <>
                        <Link to="/jobs" className="text-gray-700 hover:text-gray-900 px-3 py-2">
                          Available Jobs
                        </Link>
                        <Link to="/settings" className="text-gray-700 hover:text-gray-900 px-3 py-2">
                          Settings
                        </Link>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-4">
                {user ? (
                  <>
                    <span className="text-gray-700">
                      {user.first_name} ({user.role})
                    </span>
                    <button
                      onClick={handleLogout}
                      className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="text-gray-700 hover:text-gray-900 px-3 py-2">
                      Login
                    </Link>
                    <Link
                      to="/register"
                      className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded"
                    >
                      Sign Up
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* Email verification banner */}
        {user && !user.email_verified && (
          <div className="bg-amber-50 border-b border-amber-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
              <p className="text-sm text-amber-800">
                Please verify your email address. Check your inbox for a verification link.
              </p>
              <div className="flex items-center gap-3">
                {resendMsg && <span className="text-xs text-amber-700">{resendMsg}</span>}
                <button
                  onClick={handleResendVerification}
                  disabled={resending}
                  className="text-sm font-medium text-amber-700 hover:text-amber-900 underline disabled:opacity-50"
                >
                  {resending ? 'Sending...' : 'Resend email'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Routes */}
        <Routes>
          <Route path="/" element={<Home user={user} />} />
          <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login setUser={setUser} />} />
          <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register setUser={setUser} />} />
          <Route path="/dashboard" element={user ? <Dashboard user={user} /> : <Navigate to="/login" />} />
          <Route path="/projects" element={user ? <Projects user={user} /> : <Navigate to="/login" />} />
          <Route path="/jobs" element={user ? <Jobs user={user} /> : <Navigate to="/login" />} />
          <Route path="/jobs/:jobId" element={user ? <JobDetail user={user} /> : <Navigate to="/login" />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/settings" element={user ? <Settings user={user} /> : <Navigate to="/login" />} />
        </Routes>
        <ChatBubble />
      </div>
    </Router>
  )
}

export default App
