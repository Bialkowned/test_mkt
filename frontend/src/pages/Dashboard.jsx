import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'

export default function Dashboard({ user }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchDashboard()
  }, [])

  const fetchDashboard = async () => {
    try {
      const res = await axios.get('/api/dashboard')
      setData(res.data)
    } catch (err) {
      setError('Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-gray-200 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>
      </div>
    )
  }

  const stats = data?.stats || {}

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user.first_name}</h1>
          <p className="text-gray-500 mt-1 capitalize">{user.role} dashboard</p>
        </div>
      </div>

      {user.role === 'builder' ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <StatCard label="Projects" value={stats.total_projects} color="blue" />
            <StatCard label="Active Jobs" value={stats.active_jobs} color="amber" />
            <StatCard label="Pending Reviews" value={stats.pending_reviews} color="rose" />
            <StatCard label="Completed" value={stats.completed_jobs} color="emerald" />
          </div>

          <div className="flex gap-4">
            <Link
              to="/projects"
              className="inline-flex items-center px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
            >
              Create Project
            </Link>
            <Link
              to="/jobs"
              className="inline-flex items-center px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              Create Job
            </Link>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <StatCard label="Claimed Jobs" value={stats.claimed_jobs} color="blue" />
            <StatCard label="Completed" value={stats.completed} color="emerald" />
            <StatCard label="Pending Review" value={stats.pending_review} color="amber" />
            <StatCard label="Earnings" value={`$${(stats.earnings || 0).toFixed(2)}`} color="green" />
          </div>

          <Link
            to="/jobs"
            className="inline-flex items-center px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
          >
            Browse Jobs
          </Link>
        </>
      )}
    </div>
  )
}

const colorMap = {
  blue: 'bg-blue-50 border-blue-200 text-blue-700',
  amber: 'bg-amber-50 border-amber-200 text-amber-700',
  rose: 'bg-rose-50 border-rose-200 text-rose-700',
  emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  green: 'bg-green-50 border-green-200 text-green-700',
}

function StatCard({ label, value, color }) {
  return (
    <div className={`rounded-lg border p-5 ${colorMap[color] || colorMap.blue}`}>
      <p className="text-sm font-medium opacity-75">{label}</p>
      <p className="text-3xl font-bold mt-1">{value ?? 0}</p>
    </div>
  )
}
