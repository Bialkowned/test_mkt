import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import axios from 'axios'

export default function Home({ user }) {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/stats')
      setStats(response.data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          Get Your App Tested by Real Users
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Connect with everyday testers who provide structured feedback on your apps and websites.
          Fair escrow protection for both builders and testers.
        </p>
        {!user && (
          <div className="flex justify-center space-x-4">
            <Link
              to="/register"
              className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-lg text-lg font-semibold"
            >
              Get Started
            </Link>
            <Link
              to="/login"
              className="bg-white hover:bg-gray-50 text-primary-600 border-2 border-primary-600 px-8 py-3 rounded-lg text-lg font-semibold"
            >
              Sign In
            </Link>
          </div>
        )}
        {user && (
          <Link
            to="/dashboard"
            className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-lg text-lg font-semibold inline-block"
          >
            Go to Dashboard
          </Link>
        )}
      </div>

      {/* Platform Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
          <div className="bg-white p-6 rounded-lg shadow text-center">
            <div className="text-3xl font-bold text-primary-600">{stats.total_users}</div>
            <div className="text-gray-600 mt-2">Total Users</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow text-center">
            <div className="text-3xl font-bold text-primary-600">{stats.builders}</div>
            <div className="text-gray-600 mt-2">Builders</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow text-center">
            <div className="text-3xl font-bold text-primary-600">{stats.testers}</div>
            <div className="text-gray-600 mt-2">Testers</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow text-center">
            <div className="text-3xl font-bold text-primary-600">{stats.open_jobs}</div>
            <div className="text-gray-600 mt-2">Open Jobs</div>
          </div>
        </div>
      )}

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        <div className="bg-white p-8 rounded-lg shadow">
          <div className="text-3xl mb-4">🎯</div>
          <h3 className="text-xl font-bold mb-2">For Builders</h3>
          <p className="text-gray-600">
            Get real user feedback on your apps in 24-48 hours. Pay only $10-50 per test. 
            No coding required.
          </p>
        </div>
        <div className="bg-white p-8 rounded-lg shadow">
          <div className="text-3xl mb-4">💰</div>
          <h3 className="text-xl font-bold mb-2">For Testers</h3>
          <p className="text-gray-600">
            Earn $10-30/hour testing apps in your spare time. Clear instructions, 
            guaranteed payment.
          </p>
        </div>
        <div className="bg-white p-8 rounded-lg shadow">
          <div className="text-3xl mb-4">🔒</div>
          <h3 className="text-xl font-bold mb-2">Fair Escrow</h3>
          <p className="text-gray-600">
            Protected payments for everyone. Auto-release after 72 hours. 
            Dispute resolution available.
          </p>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-white p-12 rounded-lg shadow">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-primary-600">1</span>
            </div>
            <h3 className="font-bold mb-2">Create a Test Job</h3>
            <p className="text-gray-600">
              Builders define user journeys and set payout amount
            </p>
          </div>
          <div className="text-center">
            <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-primary-600">2</span>
            </div>
            <h3 className="font-bold mb-2">Testers Complete Tests</h3>
            <p className="text-gray-600">
              Qualified testers run journeys and submit structured feedback
            </p>
          </div>
          <div className="text-center">
            <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-primary-600">3</span>
            </div>
            <h3 className="font-bold mb-2">Review & Pay</h3>
            <p className="text-gray-600">
              Builders review submissions and escrow is released
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
