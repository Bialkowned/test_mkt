import { useState, useEffect } from 'react'
import axios from 'axios'

const CATEGORIES = ['SaaS', 'E-commerce', 'Mobile App', 'Marketing Site', 'API / Developer Tool', 'Other']

export default function Projects({ user }) {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', hosted_url: '', category: CATEGORIES[0] })

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const res = await axios.get('/api/projects')
      setProjects(res.data)
    } catch {
      setError('Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await axios.post('/api/projects', form)
      setProjects([res.data, ...projects])
      setForm({ name: '', description: '', hosted_url: '', category: CATEGORIES[0] })
      setShowForm(false)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create project')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => <div key={i} className="h-40 bg-gray-200 rounded-lg" />)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {user.role === 'builder' ? 'My Projects' : 'Projects'}
        </h1>
        {user.role === 'builder' && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
          >
            {showForm ? 'Cancel' : 'New Project'}
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">{error}</div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-lg p-6 mb-8 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
            <input
              type="text"
              required
              minLength={3}
              maxLength={100}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              required
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hosted URL</label>
              <input
                type="url"
                required
                placeholder="https://myapp.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                value={form.hosted_url}
                onChange={(e) => setForm({ ...form, hosted_url: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Project'}
          </button>
        </form>
      )}

      {projects.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-gray-500 text-lg">
            {user.role === 'builder'
              ? "You haven't created any projects yet. Click \"New Project\" to get started."
              : 'No projects available yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((p) => (
            <div key={p.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">{p.name}</h3>
                <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  {p.category}
                </span>
              </div>
              <p className="text-gray-600 text-sm mb-4 line-clamp-2">{p.description}</p>
              <div className="flex items-center justify-between text-sm">
                <a
                  href={p.hosted_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  Visit Site
                </a>
                <span className="text-gray-400">{new Date(p.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
