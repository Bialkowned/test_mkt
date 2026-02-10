import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'

const SERVICE_TYPES = [
  { id: 'test', name: 'Test', color: 'bg-blue-100 text-blue-700 border-blue-200', desc: 'Text feedback + bug reports + usability score' },
  { id: 'record', name: 'Record', color: 'bg-red-100 text-red-700 border-red-200', desc: 'Screen recording + video tags + feedback' },
  { id: 'document', name: 'Document', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', desc: 'Structured step-by-step documentation' },
  { id: 'voiceover', name: 'Voiceover', color: 'bg-purple-100 text-purple-700 border-purple-200', desc: 'Narrated screen recording with commentary' },
]

const ASSIGNMENT_TYPES = [
  { id: 'per_job', label: 'One tester does everything', desc: 'A single tester handles the entire test plan.' },
  { id: 'per_role', label: 'One tester per role', desc: 'Assign a different tester to each user role.' },
  { id: 'per_item', label: 'Individual items', desc: 'Assign testers to specific items for maximum flexibility.' },
]

const PLATFORM_FEE_RATE = 0.15

function ServiceIcon({ type, className = 'w-5 h-5' }) {
  if (type === 'test') return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
  )
  if (type === 'record') return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>
  )
  if (type === 'document') return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
  )
  if (type === 'voiceover') return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
  )
  return null
}

export default function CreateJob({ user }) {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [projects, setProjects] = useState([])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [basics, setBasics] = useState({
    project_id: '',
    title: '',
    description: '',
    assignment_type: 'per_role',
  })

  const [roles, setRoles] = useState([
    {
      id: crypto.randomUUID(),
      name: '',
      description: '',
      credentials: { email: '', password: '', notes: '' },
      items: [{ id: crypto.randomUUID(), title: '', description: '', service_type: 'test', proposed_price: 25, estimated_hours: 0.5, pages: [] }],
    },
  ])

  useEffect(() => {
    axios.get('/api/projects').then((r) => {
      setProjects(r.data)
      if (r.data.length > 0) setBasics((b) => ({ ...b, project_id: r.data[0].id }))
    }).catch(() => {})
  }, [])

  const totalItems = roles.reduce((sum, r) => sum + r.items.length, 0)
  const totalHours = roles.reduce((sum, r) => sum + r.items.reduce((s, item) => s + (parseFloat(item.estimated_hours) || 0), 0), 0)
  const proposedTotal = roles.reduce((sum, r) => sum + r.items.reduce((s, item) => s + (parseFloat(item.proposed_price) || 0), 0), 0)
  const platformFee = Math.round(proposedTotal * PLATFORM_FEE_RATE * 100) / 100
  const maxTotal = Math.round((proposedTotal + platformFee) * 100) / 100

  const addRole = () => {
    setRoles([...roles, {
      id: crypto.randomUUID(),
      name: '',
      description: '',
      credentials: { email: '', password: '', notes: '' },
      items: [{ id: crypto.randomUUID(), title: '', description: '', service_type: 'test', proposed_price: 25, estimated_hours: 0.5, pages: [] }],
    }])
  }

  const removeRole = (roleId) => {
    if (roles.length <= 1) return
    setRoles(roles.filter((r) => r.id !== roleId))
  }

  const updateRole = (roleId, field, value) => {
    setRoles(roles.map((r) => r.id === roleId ? { ...r, [field]: value } : r))
  }

  const addItem = (roleId) => {
    setRoles(roles.map((r) => r.id === roleId ? {
      ...r,
      items: [...r.items, { id: crypto.randomUUID(), title: '', description: '', service_type: 'test', proposed_price: 25, estimated_hours: 0.5, pages: [] }],
    } : r))
  }

  const removeItem = (roleId, itemId) => {
    setRoles(roles.map((r) => {
      if (r.id !== roleId) return r
      if (r.items.length <= 1) return r
      return { ...r, items: r.items.filter((item) => item.id !== itemId) }
    }))
  }

  const updateItem = (roleId, itemId, field, value) => {
    setRoles(roles.map((r) => r.id === roleId ? {
      ...r,
      items: r.items.map((item) => item.id === itemId ? { ...item, [field]: value } : item),
    } : r))
  }

  const updateCredentials = (roleId, field, value) => {
    setRoles(roles.map((r) => r.id === roleId ? {
      ...r,
      credentials: { ...r.credentials, [field]: value },
    } : r))
  }

  const addPage = (roleId, itemId) => {
    setRoles(roles.map((r) => r.id === roleId ? {
      ...r,
      items: r.items.map((item) => item.id === itemId ? {
        ...item,
        pages: [...item.pages, { id: crypto.randomUUID(), name: '', url: '' }],
      } : item),
    } : r))
  }

  const removePage = (roleId, itemId, pageId) => {
    setRoles(roles.map((r) => r.id === roleId ? {
      ...r,
      items: r.items.map((item) => item.id === itemId ? {
        ...item,
        pages: item.pages.filter((p) => p.id !== pageId),
      } : item),
    } : r))
  }

  const updatePage = (roleId, itemId, pageId, field, value) => {
    setRoles(roles.map((r) => r.id === roleId ? {
      ...r,
      items: r.items.map((item) => item.id === itemId ? {
        ...item,
        pages: item.pages.map((p) => p.id === pageId ? { ...p, [field]: value } : p),
      } : item),
    } : r))
  }

  const canProceedStep1 = basics.project_id && basics.title.trim() && basics.assignment_type
  const canProceedStep2 = roles.every((r) => r.name.trim() && r.items.every((item) => item.title.trim() && item.proposed_price > 0 && item.estimated_hours > 0))

  const handlePublish = async () => {
    setSubmitting(true)
    setError('')
    try {
      const payload = {
        project_id: basics.project_id,
        title: basics.title,
        description: basics.description,
        assignment_type: basics.assignment_type,
        estimated_time_minutes: Math.round(totalHours * 60),
        roles: roles.map((r) => ({
          name: r.name,
          description: r.description,
          credentials: (r.credentials?.email || r.credentials?.password) ? {
            email: r.credentials.email,
            password: r.credentials.password,
            notes: r.credentials.notes || '',
          } : null,
          items: r.items.map((item) => ({
            title: item.title,
            description: item.description,
            service_type: item.service_type,
            proposed_price: parseFloat(item.proposed_price),
            estimated_minutes: Math.round((parseFloat(item.estimated_hours) || 0.5) * 60),
            pages: item.pages.filter((p) => p.name.trim()).map((p) => ({
              name: p.name,
              url: p.url || '',
            })),
          })),
        })),
      }
      const res = await axios.post('/api/v2/jobs', payload)
      navigate(`/jobs/${res.data.id}`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create job')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link to="/jobs" className="text-sm text-gray-400 hover:text-gray-600 mb-6 inline-flex items-center gap-1.5">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        Back to Jobs
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Create Structured Test Job</h1>
      <p className="text-gray-500 mb-10">Define user roles, test items, and proposed pricing. Testers will bid on your plan.</p>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">{error}</div>}

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-10">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <button
              onClick={() => { if (s < step) setStep(s) }}
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                s === step ? 'bg-primary-600 text-white' : s < step ? 'bg-primary-100 text-primary-700 cursor-pointer hover:bg-primary-200' : 'bg-gray-100 text-gray-400'
              }`}
            >
              {s < step ? (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              ) : s}
            </button>
            <span className={`text-sm font-medium ${s === step ? 'text-gray-900' : 'text-gray-400'}`}>
              {s === 1 ? 'Basics' : s === 2 ? 'Test Plan' : 'Review'}
            </span>
            {s < 3 && <div className="w-12 h-px bg-gray-200 mx-1" />}
          </div>
        ))}
      </div>

      {/* Step 1: Basics */}
      {step === 1 && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm space-y-6">
          {projects.length === 0 ? (
            <p className="text-gray-500">You need to <Link to="/projects" className="text-primary-600 font-medium">create a project</Link> first.</p>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Project</label>
                <select
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                  value={basics.project_id}
                  onChange={(e) => setBasics({ ...basics, project_id: e.target.value })}
                >
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Job Title</label>
                <input
                  type="text"
                  placeholder="e.g. Full App Test Suite"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                  value={basics.title}
                  onChange={(e) => setBasics({ ...basics, title: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea
                  rows={3}
                  placeholder="Describe what you need tested and any special instructions..."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                  value={basics.description}
                  onChange={(e) => setBasics({ ...basics, description: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assignment Type</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {ASSIGNMENT_TYPES.map((at) => (
                    <button
                      key={at.id}
                      type="button"
                      onClick={() => setBasics({ ...basics, assignment_type: at.id })}
                      className={`text-left p-4 rounded-xl border-2 transition-colors ${
                        basics.assignment_type === at.id
                          ? 'border-primary-600 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="font-medium text-sm text-gray-900">{at.label}</p>
                      <p className="text-xs text-gray-500 mt-1">{at.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setStep(2)}
                  disabled={!canProceedStep1}
                  className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50 transition-colors"
                >
                  Next: Build Test Plan
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 2: Build Test Plan */}
      {step === 2 && (
        <div className="flex gap-8">
          <div className="flex-1 space-y-5">
            {roles.map((role, ri) => (
              <div key={role.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                {/* Role header */}
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold shrink-0">{ri + 1}</span>
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Role Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Admin"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          value={role.name}
                          onChange={(e) => updateRole(role.id, 'name', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Role Description</label>
                        <input
                          type="text"
                          placeholder="e.g. Admin user with full access"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          value={role.description}
                          onChange={(e) => updateRole(role.id, 'description', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  {roles.length > 1 && (
                    <button onClick={() => removeRole(role.id)} className="ml-3 text-xs text-gray-400 hover:text-red-500 font-medium mt-6">Remove</button>
                  )}
                </div>

                {/* Credentials */}
                <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-xs font-medium text-amber-700 mb-2.5">Login credentials for this role (shared with assigned tester)</p>
                  <div className="grid grid-cols-3 gap-2.5">
                    <input
                      type="text"
                      placeholder="Email / username"
                      className="px-3 py-2 border border-amber-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                      value={role.credentials?.email || ''}
                      onChange={(e) => updateCredentials(role.id, 'email', e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Password"
                      className="px-3 py-2 border border-amber-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                      value={role.credentials?.password || ''}
                      onChange={(e) => updateCredentials(role.id, 'password', e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Notes (optional)"
                      className="px-3 py-2 border border-amber-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                      value={role.credentials?.notes || ''}
                      onChange={(e) => updateCredentials(role.id, 'notes', e.target.value)}
                    />
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-4">
                  {role.items.map((item) => (
                    <div key={item.id} className="bg-gray-50 border border-gray-100 rounded-xl p-5 space-y-4">
                      {/* Title */}
                      <div className="flex items-start justify-between gap-3">
                        <input
                          type="text"
                          placeholder="Item title (e.g. Checkout Flow)"
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                          value={item.title}
                          onChange={(e) => updateItem(role.id, item.id, 'title', e.target.value)}
                        />
                        {role.items.length > 1 && (
                          <button onClick={() => removeItem(role.id, item.id)} className="text-gray-300 hover:text-red-500 mt-2">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                          </button>
                        )}
                      </div>

                      {/* Expectations */}
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Expectations</label>
                        <textarea
                          rows={2}
                          placeholder="What should the tester do, look for, or deliver?"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none bg-white"
                          value={item.description}
                          onChange={(e) => updateItem(role.id, item.id, 'description', e.target.value)}
                        />
                      </div>

                      {/* Service type pills */}
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Service Type</label>
                        <div className="flex flex-wrap gap-1.5">
                          {SERVICE_TYPES.map((st) => (
                            <button
                              key={st.id}
                              type="button"
                              onClick={() => updateItem(role.id, item.id, 'service_type', st.id)}
                              title={st.desc}
                              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                                item.service_type === st.id ? st.color + ' border-current' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              <ServiceIcon type={st.id} className="w-3.5 h-3.5" />
                              {st.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Time + Price */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-400 mb-1">Est. Time</label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={0.5}
                              step={0.5}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                              value={item.estimated_hours}
                              onChange={(e) => updateItem(role.id, item.id, 'estimated_hours', parseFloat(e.target.value) || 0.5)}
                            />
                            <span className="text-xs text-gray-400 shrink-0">hrs</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-400 mb-1">Proposed Price</label>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm text-gray-400">$</span>
                            <input
                              type="number"
                              min={1}
                              step={1}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                              value={item.proposed_price}
                              onChange={(e) => updateItem(role.id, item.id, 'proposed_price', parseFloat(e.target.value) || 0)}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Pages */}
                      <div className="bg-white rounded-lg border border-gray-200 p-3">
                        <p className="text-xs font-medium text-gray-400 mb-2">Pages in this flow</p>
                        {item.pages.length > 0 && (
                          <div className="space-y-2 mb-2">
                            {item.pages.map((page) => (
                              <div key={page.id} className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary-400 shrink-0" />
                                <input
                                  type="text"
                                  placeholder="Page name"
                                  className="flex-1 px-2.5 py-1.5 border border-gray-100 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                                  value={page.name}
                                  onChange={(e) => updatePage(role.id, item.id, page.id, 'name', e.target.value)}
                                />
                                <input
                                  type="text"
                                  placeholder="/path (optional)"
                                  className="w-28 px-2.5 py-1.5 border border-gray-100 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                                  value={page.url}
                                  onChange={(e) => updatePage(role.id, item.id, page.id, 'url', e.target.value)}
                                />
                                <button onClick={() => removePage(role.id, item.id, page.id)} className="text-gray-300 hover:text-red-400">
                                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => addPage(role.id, item.id)}
                          className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                        >
                          + Add page
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => addItem(role.id)}
                  className="mt-4 text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  + Add Item
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={addRole}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:text-gray-700 hover:border-gray-400 font-medium transition-colors"
            >
              + Add Role
            </button>

            <div className="flex justify-between pt-2">
              <button onClick={() => setStep(1)} className="px-6 py-2.5 text-gray-500 hover:text-gray-700 font-medium transition-colors">Back</button>
              <button
                onClick={() => setStep(3)}
                disabled={!canProceedStep2}
                className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50 transition-colors"
              >
                Next: Review
              </button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-72 shrink-0 hidden lg:block">
            <div className="bg-white border border-gray-200 rounded-xl p-6 sticky top-24 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Summary</h3>

              {/* Per-role breakdown */}
              <div className="space-y-3 mb-4">
                {roles.map((r) => {
                  const roleTotal = r.items.reduce((s, i) => s + (parseFloat(i.proposed_price) || 0), 0)
                  const roleHours = r.items.reduce((s, i) => s + (parseFloat(i.estimated_hours) || 0), 0)
                  return (
                    <div key={r.id} className="pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-gray-700 truncate">{r.name || 'Unnamed role'}</span>
                        <span className="font-semibold text-gray-900">${roleTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex gap-3 text-xs text-gray-400 mt-0.5">
                        <span>{r.items.length} item{r.items.length !== 1 ? 's' : ''}</span>
                        <span>{roleHours} hr{roleHours !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Totals */}
              <div className="space-y-2 text-sm pt-4 border-t border-gray-200">
                <div className="flex justify-between text-gray-600">
                  <span>Items</span>
                  <span className="font-medium">{totalItems}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Est. time</span>
                  <span className="font-medium">{totalHours} hr{totalHours !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Proposed total</span>
                  <span className="font-medium">${proposedTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Platform fee (15%)</span>
                  <span className="font-medium">${platformFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 pt-3 border-t border-gray-200 text-base">
                  <span>Max total</span>
                  <span>${maxTotal.toFixed(2)}</span>
                </div>
              </div>

              <p className="text-xs text-gray-400 mt-4 leading-relaxed">Testers can accept or counter your proposed prices. You only pay when you accept a bid.</p>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Review & Publish */}
      {step === 3 && (
        <div className="space-y-6">
          {/* Job summary */}
          <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-1">{basics.title}</h2>
            <p className="text-sm text-gray-500 mb-5">{basics.description || 'No description'}</p>
            <div className="flex gap-6 text-sm text-gray-500 mb-8 pb-6 border-b border-gray-100">
              <span>Assignment: <strong className="text-gray-900">{ASSIGNMENT_TYPES.find((a) => a.id === basics.assignment_type)?.label}</strong></span>
              <span>Est. time: <strong className="text-gray-900">{totalHours} hr{totalHours !== 1 ? 's' : ''}</strong></span>
              <span>Items: <strong className="text-gray-900">{totalItems}</strong></span>
            </div>

            {/* Roles + items */}
            <div className="space-y-8">
              {roles.map((role, ri) => (
                <div key={role.id}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold">{ri + 1}</span>
                    <h3 className="font-bold text-gray-900">{role.name}</h3>
                    {role.description && <span className="text-xs text-gray-400">— {role.description}</span>}
                  </div>

                  {(role.credentials?.email || role.credentials?.password) && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 mb-3 text-xs text-amber-700 flex items-center gap-2">
                      <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                      <span>
                        <span className="font-medium">Credentials:</span>{' '}
                        {role.credentials.email && <span>{role.credentials.email}</span>}
                        {role.credentials.password && <span> / {role.credentials.password}</span>}
                        {role.credentials.notes && <span className="text-amber-500 ml-1.5">({role.credentials.notes})</span>}
                      </span>
                    </div>
                  )}

                  <div className="space-y-2">
                    {role.items.map((item) => {
                      const st = SERVICE_TYPES.find((s) => s.id === item.service_type)
                      const pageCount = item.pages.filter((p) => p.name.trim()).length
                      return (
                        <div key={item.id} className="bg-gray-50 rounded-xl p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-lg shrink-0 mt-0.5 ${st?.color || 'bg-gray-100 text-gray-600'}`}>
                                <ServiceIcon type={item.service_type} className="w-3 h-3" />
                                {st?.name}
                              </span>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{item.title}</p>
                                {item.description && <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.description}</p>}
                              </div>
                            </div>
                            <div className="text-right shrink-0 ml-4">
                              <p className="font-bold text-gray-900">${parseFloat(item.proposed_price).toFixed(2)}</p>
                              <p className="text-xs text-gray-400">{item.estimated_hours} hr{item.estimated_hours !== 1 ? 's' : ''}</p>
                            </div>
                          </div>
                          {pageCount > 0 && (
                            <div className="mt-2.5 ml-[52px] pl-3 border-l-2 border-gray-200 space-y-0.5">
                              {item.pages.filter((p) => p.name.trim()).map((page) => (
                                <div key={page.id} className="text-xs text-gray-500 flex items-center gap-2">
                                  <span className="w-1 h-1 rounded-full bg-gray-300" />
                                  <span>{page.name}</span>
                                  {page.url && <span className="text-gray-300">{page.url}</span>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cost breakdown */}
          <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Cost Breakdown</h3>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Proposed total ({totalItems} items, {totalHours} hrs)</span>
                <span>${proposedTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Platform fee (15%)</span>
                <span>${platformFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 pt-3 border-t border-gray-200 text-base">
                <span>Max total if all accepted at proposed price</span>
                <span>${maxTotal.toFixed(2)}</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-4 leading-relaxed">No payment now. Testers bid on your plan. You pay only when you accept a bid.</p>
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep(2)} className="px-6 py-2.5 text-gray-500 hover:text-gray-700 font-medium transition-colors">Back</button>
            <button
              onClick={handlePublish}
              disabled={submitting}
              className="px-8 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 font-semibold disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Publishing...' : 'Publish Job'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
