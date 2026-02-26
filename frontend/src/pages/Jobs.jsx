import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
const stripePromise = stripeKey ? loadStripe(stripeKey) : null

const SERVICE_TYPE_COLORS = {
  test: 'bg-blue-100 text-blue-700',
  record: 'bg-purple-100 text-purple-700',
  document: 'bg-emerald-100 text-emerald-700',
  voiceover: 'bg-amber-100 text-amber-700',
}

function isV2Job(job) {
  return job.version === 2 || !!job.roles
}

function getV2Info(job) {
  if (!isV2Job(job)) return null
  const allItems = job.roles?.flatMap((r) => r.items) || []
  const serviceTypes = [...new Set(allItems.map((i) => i.service_type))]
  const prices = allItems.map((i) => i.proposed_price).filter(Boolean)
  const priceMin = prices.length ? Math.min(...prices) : 0
  const priceMax = prices.length ? Math.max(...prices) : 0
  return {
    serviceTypes,
    priceMin,
    priceMax,
    itemCount: allItems.length,
    roleCount: job.roles?.length || 0,
    proposedTotal: job.proposed_total || prices.reduce((a, b) => a + b, 0),
  }
}

export default function Jobs({ user }) {
  const [jobs, setJobs] = useState([])
  const [projects, setProjects] = useState([])
  const [bids, setBids] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [tab, setTab] = useState('available')
  const [form, setForm] = useState({
    project_id: '',
    title: '',
    description: '',
    payout_amount: '',
    max_testers: 3,
    estimated_time_minutes: 30,
  })
  const [paymentStep, setPaymentStep] = useState(null)

  useEffect(() => {
    fetchJobs()
    if (user.role === 'builder') fetchProjects()
    if (user.role === 'tester') fetchBids()
  }, [])

  const fetchJobs = async () => {
    try {
      const res = await axios.get('/api/jobs')
      setJobs(res.data)
    } catch {
      setError('Failed to load jobs')
    } finally {
      setLoading(false)
    }
  }

  const fetchProjects = async () => {
    try {
      const res = await axios.get('/api/projects')
      setProjects(res.data)
      if (res.data.length > 0) {
        setForm((f) => ({ ...f, project_id: res.data[0].id }))
      }
    } catch {}
  }

  const fetchBids = async () => {
    try {
      const res = await axios.get('/api/bids')
      setBids(res.data)
    } catch {}
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const payload = { ...form, payout_amount: parseFloat(form.payout_amount) }
      const res = await axios.post('/api/jobs', payload)
      setPaymentStep({ job: res.data, clientSecret: res.data.client_secret })
      setShowForm(false)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create job')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePaymentSuccess = (job) => {
    setPaymentStep(null)
    setJobs([{ ...job, status: 'open' }, ...jobs.filter((j) => j.id !== job.id)])
    setForm({ project_id: projects[0]?.id || '', title: '', description: '', payout_amount: '', max_testers: 3, estimated_time_minutes: 30 })
  }

  const handleCompletePayment = async (job) => {
    setError('')
    try {
      const res = await axios.post(`/api/jobs/${job.id}/payment-intent`)
      if (res.data.already_paid) {
        fetchJobs()
        return
      }
      setPaymentStep({ job, clientSecret: res.data.client_secret })
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load payment')
    }
  }

  const handleClaim = async (jobId) => {
    try {
      await axios.post(`/api/jobs/${jobId}/claim`)
      fetchJobs()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to claim job')
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded-lg" />)}
          </div>
        </div>
      </div>
    )
  }

  // Payment step overlay (v1 jobs)
  if (paymentStep) {
    const { job, clientSecret } = paymentStep
    return (
      <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <button
          onClick={() => { setPaymentStep(null); fetchJobs() }}
          className="text-sm text-gray-500 hover:text-gray-700 mb-6 inline-block"
        >
          &larr; Back to Jobs
        </button>
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Complete Payment</h2>
          <p className="text-gray-500 text-sm mb-5">Pay to publish your test job: <strong>{job.title}</strong></p>

          <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Payout per tester</span>
              <span className="text-gray-900">${job.payout_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Testers</span>
              <span className="text-gray-900">{job.max_testers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span className="text-gray-900">${(job.payout_amount * job.max_testers).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Platform fee (15%)</span>
              <span className="text-gray-900">${job.platform_fee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-200 font-semibold">
              <span className="text-gray-900">Total</span>
              <span className="text-gray-900">${job.total_charge.toFixed(2)}</span>
            </div>
          </div>

          <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
            <PaymentForm job={job} onSuccess={handlePaymentSuccess} />
          </Elements>
        </div>
      </div>
    )
  }

  // Builder view
  if (user.role === 'builder') {
    const grouped = {
      pending_payment: jobs.filter((j) => j.status === 'pending_payment'),
      bidding: jobs.filter((j) => isV2Job(j) && j.status === 'open'),
      open: jobs.filter((j) => !isV2Job(j) && j.status === 'open'),
      in_progress: jobs.filter((j) => j.status === 'in_progress'),
      completed: jobs.filter((j) => j.status === 'completed'),
    }

    const groupLabels = {
      pending_payment: 'Pending Payment',
      bidding: 'Accepting Bids',
      open: 'Open',
      in_progress: 'In Progress',
      completed: 'Completed',
    }

    return (
      <div className="px-6 lg:px-10 py-10 max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Test Jobs</h1>
            <p className="text-gray-500 text-sm mt-1">Manage your test jobs and review submissions.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/jobs/create"
              className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 font-medium transition-colors"
            >
              New Structured Job
            </Link>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm rounded-lg hover:border-gray-300 font-medium transition-colors"
            >
              {showForm ? 'Cancel' : 'Quick Job'}
            </button>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">{error}</div>}

        {showForm && (
          <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-lg p-6 mb-8 space-y-4">
            {projects.length === 0 ? (
              <p className="text-gray-500">
                You need to <Link to="/projects" className="text-primary-600 font-medium">create a project</Link> first.
              </p>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    value={form.project_id}
                    onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                  >
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    required
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="Describe the user journey to test..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payout ($)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="1000"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      value={form.payout_amount}
                      onChange={(e) => setForm({ ...form, payout_amount: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Testers</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="10"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      value={form.max_testers}
                      onChange={(e) => setForm({ ...form, max_testers: parseInt(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Est. Time (min)</label>
                    <input
                      type="number"
                      required
                      min="5"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      value={form.estimated_time_minutes}
                      onChange={(e) => setForm({ ...form, estimated_time_minutes: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                {form.payout_amount && form.max_testers && (
                  <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
                    <div className="flex justify-between text-gray-600">
                      <span>Payout: ${parseFloat(form.payout_amount || 0).toFixed(2)} x {form.max_testers} testers</span>
                      <span>${(parseFloat(form.payout_amount || 0) * form.max_testers).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Platform fee (15%)</span>
                      <span>${(parseFloat(form.payout_amount || 0) * form.max_testers * 0.15).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-gray-900 pt-1 border-t border-gray-200">
                      <span>Total charge</span>
                      <span>${(parseFloat(form.payout_amount || 0) * form.max_testers * 1.15).toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create & Pay'}
                </button>
              </>
            )}
          </form>
        )}

        {jobs.length === 0 ? (
          <EmptyState
            title="No jobs yet"
            subtitle="Create a project first, then add test jobs to get feedback."
          />
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([status, items]) =>
              items.length > 0 && (
                <div key={status}>
                  <div className="flex items-center gap-2 mb-4">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                      {groupLabels[status]}
                    </h2>
                    <span className="text-xs text-gray-300 tabular-nums">{items.length}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {items.map((job) => (
                      <JobCard
                        key={job.id}
                        job={job}
                        role="builder"
                        onCompletePayment={() => handleCompletePayment(job)}
                      />
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    )
  }

  // Tester view
  const available = jobs.filter((j) => j.status === 'open' || (j.status === 'in_progress' && !j.assigned_testers?.includes(user.email)))
  const claimed = jobs.filter((j) => j.assigned_testers?.includes(user.email))

  const tabs = [
    { key: 'available', label: 'Available', count: available.length },
    { key: 'bids', label: 'My Bids', count: bids.length },
    { key: 'claimed', label: 'Claimed', count: claimed.length },
  ]

  const activeList = tab === 'available' ? available : tab === 'claimed' ? claimed : []

  return (
    <div className="px-6 lg:px-10 py-10 max-w-[1400px] mx-auto">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
          <p className="text-gray-400 text-sm mt-1">Browse open test jobs and submit bids on structured work.</p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {tabs.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-3.5 py-1.5 text-sm font-medium rounded-md transition-all ${
                tab === key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
              {count > 0 && <span className="ml-1 text-xs tabular-nums text-gray-400">{count}</span>}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-6">{error}</div>}

      {tab === 'bids' ? (
        bids.length === 0 ? (
          <EmptyState
            title="No bids yet"
            subtitle="Browse available jobs and place a bid on structured work to get started."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {bids.map((bid) => (
              <BidCard key={bid.id} bid={bid} />
            ))}
          </div>
        )
      ) : activeList.length === 0 ? (
        <EmptyState
          title={tab === 'available' ? 'No jobs available' : 'Nothing claimed yet'}
          subtitle={tab === 'available' ? 'Check back soon — new jobs are posted regularly.' : 'Claim a quick job or bid on structured work to see it here.'}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {activeList.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              role="tester"
              isClaimed={job.assigned_testers?.includes(user.email)}
              onClaim={() => handleClaim(job.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyState({ title, subtitle }) {
  return (
    <div className="py-16 text-center">
      <div className="w-12 h-12 rounded-full bg-gray-100 mx-auto mb-4 flex items-center justify-center">
        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
      </div>
      <p className="text-sm font-medium text-gray-900">{title}</p>
      <p className="text-sm text-gray-400 mt-1 max-w-sm mx-auto">{subtitle}</p>
    </div>
  )
}

function JobCard({ job, role, isClaimed, onClaim, onCompletePayment }) {
  const isPending = job.status === 'pending_payment'
  const v2 = isV2Job(job)
  const v2Info = v2 ? getV2Info(job) : null

  const timeLabel = job.estimated_time_minutes >= 60
    ? `${Math.floor(job.estimated_time_minutes / 60)}h${job.estimated_time_minutes % 60 ? ` ${job.estimated_time_minutes % 60}m` : ''}`
    : `${job.estimated_time_minutes}m`

  const slotsOpen = v2 ? null : (job.max_testers || 0) - (job.assigned_testers?.length || 0)

  const card = (
    <div className={`group bg-white rounded-xl border border-gray-200 flex flex-col h-full ${isPending ? 'opacity-60' : 'hover:border-gray-300 hover:shadow-sm'} transition-all`}>

      {/* Header band */}
      <div className={`px-4 py-2.5 rounded-t-xl flex items-center justify-between ${v2 ? 'bg-indigo-50' : 'bg-gray-50'}`}>
        <div className="flex items-center gap-2 min-w-0">
          {job.project_name && (
            <span className="text-xs font-semibold text-gray-600 truncate">{job.project_name}</span>
          )}
        </div>
        <span className={`text-[11px] font-semibold uppercase tracking-wide shrink-0 ${v2 ? 'text-indigo-500' : 'text-gray-400'}`}>
          {v2 ? job.assignment_type?.replace('_', ' ') : 'Quick'}
        </span>
      </div>

      {/* Body */}
      <div className="px-4 pt-3.5 pb-3 flex-1 flex flex-col">
        <h3 className="text-[15px] font-semibold text-gray-900 leading-snug mb-2 group-hover:text-gray-700 transition-colors line-clamp-2">
          {job.title}
        </h3>
        <p className="text-[13px] text-gray-400 leading-relaxed line-clamp-2 mb-auto">{job.description}</p>

        {/* Tags row */}
        {v2Info && v2Info.serviceTypes.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {v2Info.serviceTypes.map((st) => (
              <span key={st} className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-px rounded ${SERVICE_TYPE_COLORS[st] || 'bg-gray-100 text-gray-600'}`}>
                {st}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="px-4 py-2.5 border-t border-gray-100 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[11px] text-gray-400 uppercase tracking-wide">Pay</p>
          <p className="text-sm font-bold text-gray-900 mt-0.5">
            {v2Info
              ? v2Info.priceMin === v2Info.priceMax
                ? `$${v2Info.priceMin}`
                : `$${v2Info.priceMin}\u2013${v2Info.priceMax}`
              : `$${job.payout_amount}`
            }
          </p>
        </div>
        <div>
          <p className="text-[11px] text-gray-400 uppercase tracking-wide">Time</p>
          <p className="text-sm font-bold text-gray-900 mt-0.5">{timeLabel}</p>
        </div>
        <div>
          <p className="text-[11px] text-gray-400 uppercase tracking-wide">{v2 ? 'Scope' : 'Slots'}</p>
          <p className="text-sm font-bold text-gray-900 mt-0.5">
            {v2Info
              ? `${v2Info.roleCount}R / ${v2Info.itemCount}I`
              : `${slotsOpen} open`
            }
          </p>
        </div>
      </div>

      {/* Action footer */}
      <div className="px-4 py-3 border-t border-gray-100 rounded-b-xl">
        {role === 'builder' && isPending && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCompletePayment() }}
            className="w-full text-center text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors"
          >
            Complete payment &rarr;
          </button>
        )}
        {role === 'builder' && !isPending && (
          <span className="block w-full text-center text-sm font-medium text-gray-400 group-hover:text-gray-900 transition-colors">
            View details &rarr;
          </span>
        )}
        {role === 'tester' && !isClaimed && !v2 && (job.status === 'open' || job.status === 'in_progress') && (
          <button
            onClick={(e) => { e.preventDefault(); onClaim() }}
            className="w-full text-center px-4 py-1.5 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 font-medium transition-colors"
          >
            Claim slot
          </button>
        )}
        {role === 'tester' && !isClaimed && v2 && job.status === 'open' && (
          <span className="block w-full text-center text-sm font-medium text-indigo-600 group-hover:text-indigo-700 transition-colors">
            View &amp; bid &rarr;
          </span>
        )}
        {role === 'tester' && isClaimed && (
          <span className="block w-full text-center text-sm font-semibold text-primary-600">
            Continue &rarr;
          </span>
        )}
      </div>
    </div>
  )

  if (isPending) return card

  return (
    <Link to={`/jobs/${job.id}`} className="block h-full">
      {card}
    </Link>
  )
}

function BidCard({ bid }) {
  const statusBand = {
    pending: 'bg-amber-50',
    accepted: 'bg-emerald-50',
    rejected: 'bg-red-50',
    withdrawn: 'bg-gray-50',
  }
  const statusText = {
    pending: 'text-amber-600',
    accepted: 'text-emerald-600',
    rejected: 'text-red-600',
    withdrawn: 'text-gray-400',
  }

  return (
    <Link to={`/jobs/${bid.job_id}`} className="block h-full group">
      <div className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all flex flex-col h-full">
        {/* Header */}
        <div className={`px-4 py-2.5 rounded-t-xl flex items-center justify-between ${statusBand[bid.status] || 'bg-gray-50'}`}>
          <span className={`text-[11px] font-bold uppercase tracking-wide ${statusText[bid.status] || 'text-gray-400'}`}>
            {bid.status}
          </span>
          {bid.is_counter && (
            <span className="text-[11px] font-semibold uppercase tracking-wide text-purple-500">Counter</span>
          )}
        </div>

        {/* Body */}
        <div className="px-4 pt-3.5 pb-3 flex-1">
          <h3 className="text-[15px] font-semibold text-gray-900 leading-snug mb-1 group-hover:text-gray-700 transition-colors line-clamp-2">
            {bid.job_title || 'Test Job'}
          </h3>
          {bid.message && (
            <p className="text-[13px] text-gray-400 line-clamp-2">{bid.message}</p>
          )}
        </div>

        {/* Stats */}
        <div className="px-4 py-2.5 border-t border-gray-100 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[11px] text-gray-400 uppercase tracking-wide">Bid</p>
            <p className="text-sm font-bold text-gray-900 mt-0.5">${bid.bid_price?.toFixed(0)}</p>
          </div>
          <div>
            <p className="text-[11px] text-gray-400 uppercase tracking-wide">Scope</p>
            <p className="text-sm font-bold text-gray-900 mt-0.5 capitalize">{bid.scope_type?.replace('_', ' ') || '—'}</p>
          </div>
          <div>
            <p className="text-[11px] text-gray-400 uppercase tracking-wide">Date</p>
            <p className="text-sm font-bold text-gray-900 mt-0.5">{new Date(bid.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-100 rounded-b-xl">
          <span className="block w-full text-center text-sm font-medium text-gray-400 group-hover:text-gray-900 transition-colors">
            View job &rarr;
          </span>
        </div>
      </div>
    </Link>
  )
}

function PaymentForm({ job, onSuccess }) {
  const stripe = useStripe()
  const elements = useElements()
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState('')

  const handlePay = async (e) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setPaying(true)
    setPayError('')

    const { error } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    })

    if (error) {
      setPayError(error.message)
      setPaying(false)
      return
    }

    try {
      const res = await axios.post(`/api/jobs/${job.id}/confirm-payment`)
      onSuccess(res.data)
    } catch (err) {
      setPayError(err.response?.data?.detail || 'Payment confirmed but failed to update job. Refresh the page.')
    } finally {
      setPaying(false)
    }
  }

  return (
    <form onSubmit={handlePay}>
      <PaymentElement />
      {payError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded mt-4">{payError}</div>
      )}
      <button
        type="submit"
        disabled={!stripe || paying}
        className="w-full mt-5 px-5 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold disabled:opacity-50"
      >
        {paying ? 'Processing...' : `Pay $${job.total_charge.toFixed(2)}`}
      </button>
    </form>
  )
}
