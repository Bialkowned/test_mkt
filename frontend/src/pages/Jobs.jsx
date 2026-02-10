import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

export default function Jobs({ user }) {
  const [jobs, setJobs] = useState([])
  const [projects, setProjects] = useState([])
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

  // Payment step state
  const [paymentStep, setPaymentStep] = useState(null) // { job, clientSecret }

  useEffect(() => {
    fetchJobs()
    if (user.role === 'builder') fetchProjects()
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

  const handleCreate = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const payload = { ...form, payout_amount: parseFloat(form.payout_amount) }
      const res = await axios.post('/api/jobs', payload)
      // Backend returns job + client_secret — transition to payment step
      setPaymentStep({ job: res.data, clientSecret: res.data.client_secret })
      setShowForm(false)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create job')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePaymentSuccess = (job) => {
    // Job is now open — add to list and reset state
    setPaymentStep(null)
    setJobs([{ ...job, status: 'open' }, ...jobs.filter((j) => j.id !== job.id)])
    setForm({ project_id: projects[0]?.id || '', title: '', description: '', payout_amount: '', max_testers: 3, estimated_time_minutes: 30 })
  }

  const handleCompletePayment = async (job) => {
    setError('')
    try {
      const res = await axios.post(`/api/jobs/${job.id}/payment-intent`)
      if (res.data.already_paid) {
        // Already paid — just refresh
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

  // Payment step overlay
  if (paymentStep) {
    const { job, clientSecret } = paymentStep
    return (
      <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <button
          onClick={() => { setPaymentStep(null); fetchJobs() }}
          className="text-sm text-gray-500 hover:text-gray-700 mb-6 inline-block"
        >
          Back to Jobs
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
      open: jobs.filter((j) => j.status === 'open'),
      in_progress: jobs.filter((j) => j.status === 'in_progress'),
      completed: jobs.filter((j) => j.status === 'completed'),
    }

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Test Jobs</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
          >
            {showForm ? 'Cancel' : 'New Job'}
          </button>
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

                {/* Cost preview */}
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
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
            <p className="text-gray-500 text-lg">No jobs yet. Create a project first, then add test jobs.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([status, items]) =>
              items.length > 0 && (
                <div key={status}>
                  <h2 className="text-lg font-semibold text-gray-700 mb-3 capitalize">{status.replace('_', ' ')} ({items.length})</h2>
                  <div className="space-y-3">
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

  const displayed = tab === 'available' ? available : claimed

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Jobs</h1>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">{error}</div>}

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        <button
          onClick={() => setTab('available')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'available'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Available ({available.length})
        </button>
        <button
          onClick={() => setTab('claimed')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'claimed'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          My Claimed ({claimed.length})
        </button>
      </div>

      {displayed.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-gray-500 text-lg">
            {tab === 'available' ? 'No available jobs right now. Check back soon!' : "You haven't claimed any jobs yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((job) => (
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

const statusColors = {
  pending_payment: 'bg-orange-100 text-orange-700',
  open: 'bg-green-100 text-green-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-blue-100 text-blue-700',
}

function JobCard({ job, role, isClaimed, onClaim, onCompletePayment }) {
  const isPending = job.status === 'pending_payment'

  const card = (
    <div className={`bg-white border border-gray-200 rounded-lg p-5 ${isPending ? '' : 'hover:shadow-md'} transition-shadow`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-lg font-semibold text-gray-900 truncate">{job.title}</h3>
            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${statusColors[job.status] || 'bg-gray-100 text-gray-600'}`}>
              {job.status.replace('_', ' ')}
            </span>
          </div>
          {job.project_name && (
            <p className="text-sm text-gray-500 mb-2">{job.project_name}</p>
          )}
          <p className="text-gray-600 text-sm line-clamp-1">{job.description}</p>
        </div>
        <div className="flex items-center gap-4 ml-4 shrink-0">
          <div className="text-right">
            <p className="text-lg font-bold text-gray-900">${job.payout_amount}</p>
            <p className="text-xs text-gray-500">{job.estimated_time_minutes} min</p>
          </div>
          {role === 'builder' && isPending && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCompletePayment() }}
              className="px-4 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 font-medium"
            >
              Complete Payment
            </button>
          )}
          {role === 'tester' && !isClaimed && (job.status === 'open' || job.status === 'in_progress') && (
            <button
              onClick={(e) => { e.preventDefault(); onClaim() }}
              className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 font-medium"
            >
              Claim
            </button>
          )}
          {role === 'tester' && isClaimed && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary-50 text-primary-700">Claimed</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
        <span>{job.assigned_testers?.length || 0} / {job.max_testers} testers</span>
        <span>{new Date(job.created_at).toLocaleDateString()}</span>
        {role === 'builder' && job.total_charge > 0 && (
          <span>Total: ${job.total_charge.toFixed(2)}</span>
        )}
      </div>
    </div>
  )

  if (isPending) return card

  return (
    <Link to={`/jobs/${job.id}`} className="block">
      {card}
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

    // Payment succeeded — confirm with backend
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
