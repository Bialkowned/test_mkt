import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

const SEVERITIES = ['low', 'medium', 'high', 'critical']
const severityColors = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
}

const TAG_COLORS = {
  'bug': 'bg-red-100 text-red-700 border-red-200',
  'ux-issue': 'bg-amber-100 text-amber-700 border-amber-200',
  'training-clip': 'bg-blue-100 text-blue-700 border-blue-200',
  'marketing-clip': 'bg-green-100 text-green-700 border-green-200',
}

const SERVICE_COLORS = {
  test: 'bg-blue-100 text-blue-700',
  record: 'bg-red-100 text-red-700',
  document: 'bg-emerald-100 text-emerald-700',
  voiceover: 'bg-purple-100 text-purple-700',
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function parseTimeToSeconds(str) {
  const parts = str.split(':').map(Number)
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return parts[0] * 60 + parts[1]
  }
  return NaN
}

export default function JobDetail({ user }) {
  const { jobId } = useParams()
  const [job, setJob] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [bids, setBids] = useState([])
  const [mySubmission, setMySubmission] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const isV2 = job?.version === 2 || job?.roles

  useEffect(() => { fetchData() }, [jobId])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [jobRes, subsRes] = await Promise.all([
        axios.get(`/api/jobs/${jobId}`),
        axios.get(`/api/submissions?job_id=${jobId}`),
      ])
      setJob(jobRes.data)
      setSubmissions(subsRes.data)

      if (user.role === 'tester') {
        const mine = subsRes.data.find((s) => s.tester_email === user.email)
        if (mine) setMySubmission(mine)
      }

      // Fetch bids for v2 jobs
      if (jobRes.data.version === 2 || jobRes.data.roles) {
        try {
          const bidsRes = await axios.get(`/api/jobs/${jobId}/bids`)
          setBids(bidsRes.data)
        } catch {}
      }
    } catch {
      setError('Failed to load job details')
    } finally {
      setLoading(false)
    }
  }

  const handleClaim = async () => {
    try {
      const res = await axios.post(`/api/jobs/${jobId}/claim`)
      setJob(res.data.job)
      fetchData()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to claim job')
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-6 bg-gray-200 rounded w-32" />
          <div className="h-10 bg-gray-200 rounded w-96" />
          <div className="h-40 bg-gray-200 rounded-lg" />
        </div>
      </div>
    )
  }

  if (error && !job) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>
        <Link to="/jobs" className="text-primary-600 hover:text-primary-700 font-medium mt-4 inline-block">Back to Jobs</Link>
      </div>
    )
  }

  const statusColors = {
    pending_payment: 'bg-orange-100 text-orange-700',
    open: 'bg-green-100 text-green-700',
    in_progress: 'bg-amber-100 text-amber-700',
    completed: 'bg-blue-100 text-blue-700',
  }

  if (isV2) {
    return (
      <V2JobDetail
        job={job}
        user={user}
        submissions={submissions}
        bids={bids}
        error={error}
        setError={setError}
        fetchData={fetchData}
        statusColors={statusColors}
      />
    )
  }

  // V1 job detail (original)
  const isClaimed = job.assigned_testers?.includes(user.email)
  const canClaim = user.role === 'tester' && !isClaimed && (job.status === 'open' || job.status === 'in_progress') && (job.assigned_testers?.length || 0) < job.max_testers

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link to="/jobs" className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block">Back to Jobs</Link>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">{error}</div>}

      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
            {job.project_name && <p className="text-gray-500 mt-1">{job.project_name}</p>}
          </div>
          <span className={`text-xs font-medium px-3 py-1 rounded-full ${statusColors[job.status] || 'bg-gray-100 text-gray-600'}`}>
            {job.status.replace('_', ' ')}
          </span>
        </div>
        <p className="text-gray-700 whitespace-pre-wrap mb-6">{job.description}</p>
        <div className="flex items-center gap-6 text-sm text-gray-500">
          <span><strong className="text-gray-900">${job.payout_amount}</strong> per tester</span>
          <span>{job.estimated_time_minutes} min estimated</span>
          <span>{job.assigned_testers?.length || 0} / {job.max_testers} testers</span>
        </div>

        {user.role === 'builder' && job.total_charge > 0 && (
          <div className="mt-5 bg-gray-50 rounded-lg p-4 text-sm space-y-1.5">
            <div className="flex justify-between text-gray-600"><span>Payout per tester</span><span>${job.payout_amount.toFixed(2)}</span></div>
            <div className="flex justify-between text-gray-600"><span>Testers</span><span>{job.max_testers}</span></div>
            <div className="flex justify-between text-gray-600"><span>Platform fee (15%)</span><span>${job.platform_fee.toFixed(2)}</span></div>
            <div className="flex justify-between font-semibold text-gray-900 pt-1.5 border-t border-gray-200"><span>Total charged</span><span>${job.total_charge.toFixed(2)}</span></div>
          </div>
        )}

        {canClaim && (
          <button onClick={handleClaim} className="mt-6 px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium">
            Claim This Job
          </button>
        )}
      </div>

      {user.role === 'builder' && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Submissions ({submissions.length})</h2>
          {submissions.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
              <p className="text-gray-500">No submissions yet. Waiting for testers to claim and submit feedback.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {submissions.map((sub) => (
                <BuilderSubmissionCard key={sub.id} submission={sub} onUpdate={fetchData} setError={setError} />
              ))}
            </div>
          )}
        </div>
      )}

      {user.role === 'tester' && isClaimed && mySubmission && (
        <TesterSubmission submission={mySubmission} onUpdate={fetchData} setError={setError} />
      )}
    </div>
  )
}

// ============== V2 Job Detail ==============

function V2JobDetail({ job, user, submissions, bids, error, setError, fetchData, statusColors }) {
  const [expandedRoles, setExpandedRoles] = useState(new Set(job.roles?.map((r) => r.id) || []))
  const [paymentBid, setPaymentBid] = useState(null)

  const toggleRole = (roleId) => {
    const next = new Set(expandedRoles)
    if (next.has(roleId)) next.delete(roleId)
    else next.add(roleId)
    setExpandedRoles(next)
  }

  const myBids = bids.filter((b) => b.tester_email === user.email)
  const isAssigned = job.assigned_testers?.includes(user.email)
  const mySubmissions = submissions.filter((s) => s.tester_email === user.email)

  const handleAcceptBid = async (bid) => {
    setError('')
    try {
      const res = await axios.post(`/api/bids/${bid.id}/accept`)
      setPaymentBid({ ...res.data, client_secret: res.data.client_secret })
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to accept bid')
    }
  }

  const handleRejectBid = async (bidId) => {
    if (!confirm('Reject this bid?')) return
    try {
      await axios.post(`/api/bids/${bidId}/reject`)
      fetchData()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reject bid')
    }
  }

  const handleWithdrawBid = async (bidId) => {
    if (!confirm('Withdraw your bid?')) return
    try {
      await axios.post(`/api/bids/${bidId}/withdraw`)
      fetchData()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to withdraw bid')
    }
  }

  const handlePaymentSuccess = async (bid) => {
    try {
      await axios.post(`/api/bids/${bid.id}/confirm-payment`)
      setPaymentBid(null)
      fetchData()
    } catch (err) {
      setError(err.response?.data?.detail || 'Payment confirmed but failed to create submissions. Refresh the page.')
    }
  }

  // Payment overlay
  if (paymentBid?.client_secret) {
    return (
      <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <button onClick={() => { setPaymentBid(null); fetchData() }} className="text-sm text-gray-500 hover:text-gray-700 mb-6 inline-block">
          Back to Job
        </button>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Complete Payment</h2>
          <p className="text-gray-500 text-sm mb-5">Pay to accept <strong>{paymentBid.tester_name}</strong>'s bid</p>

          <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-600">Bid amount</span><span>${paymentBid.bid_price?.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Platform fee (15%)</span><span>${paymentBid.platform_fee?.toFixed(2)}</span></div>
            <div className="flex justify-between font-semibold text-gray-900 pt-2 border-t border-gray-200"><span>Total</span><span>${paymentBid.total_charge?.toFixed(2)}</span></div>
          </div>

          <Elements stripe={stripePromise} options={{ clientSecret: paymentBid.client_secret, appearance: { theme: 'stripe' } }}>
            <BidPaymentForm bid={paymentBid} onSuccess={() => handlePaymentSuccess(paymentBid)} />
          </Elements>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link to="/jobs" className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block">Back to Jobs</Link>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">{error}</div>}

      {/* Job Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
              <span className="text-xs px-2 py-0.5 rounded bg-primary-50 text-primary-700 font-medium">Structured</span>
            </div>
            {job.project_name && <p className="text-gray-500">{job.project_name}</p>}
          </div>
          <span className={`text-xs font-medium px-3 py-1 rounded-full ${statusColors[job.status] || 'bg-gray-100 text-gray-600'}`}>
            {job.status.replace('_', ' ')}
          </span>
        </div>
        {job.description && <p className="text-gray-700 whitespace-pre-wrap mb-4">{job.description}</p>}
        <div className="flex items-center gap-6 text-sm text-gray-500">
          <span><strong className="text-gray-900">${job.proposed_total?.toFixed(2)}</strong> proposed total</span>
          <span>{job.estimated_time_minutes} min estimated</span>
          <span className="capitalize">{job.assignment_type?.replace('_', ' ')} assignment</span>
          <span>{job.roles?.length} roles, {job.roles?.reduce((s, r) => s + r.items.length, 0)} items</span>
        </div>
      </div>

      {/* Test Plan Viewer */}
      <div className="bg-white border border-gray-200 rounded-lg mb-6">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Test Plan</h2>
        </div>
        {job.roles?.map((role) => {
          const expanded = expandedRoles.has(role.id)
          const roleTotal = role.items.reduce((s, i) => s + i.proposed_price, 0)
          return (
            <div key={role.id} className="border-b border-gray-100 last:border-b-0">
              <button
                onClick={() => toggleRole(role.id)}
                className="w-full px-6 py-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                  <span className="font-semibold text-gray-900">{role.name}</span>
                  {role.description && <span className="text-xs text-gray-400">— {role.description}</span>}
                  <span className="text-xs text-gray-400">{role.items.length} items</span>
                </div>
                <span className="text-sm font-medium text-gray-700">${roleTotal.toFixed(2)}</span>
              </button>
              {expanded && (
                <div className="px-6 pb-4 space-y-2">
                  {role.items.map((item) => {
                    const itemSubs = submissions.filter((s) => s.item_id === item.id)
                    const itemStatus = itemSubs.length > 0 ? itemSubs[0].status : 'open'
                    return (
                      <div key={item.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${SERVICE_COLORS[item.service_type] || 'bg-gray-100 text-gray-600'}`}>
                            {item.service_type}
                          </span>
                          <span className="text-sm text-gray-900">{item.title}</span>
                          {item.description && <span className="text-xs text-gray-400 hidden sm:inline">— {item.description}</span>}
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-xs text-gray-400">{item.estimated_minutes} min</span>
                          <span className="font-medium text-gray-900">${item.proposed_price.toFixed(2)}</span>
                          {itemSubs.length > 0 && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              itemStatus === 'approved' ? 'bg-green-100 text-green-700' :
                              itemStatus === 'submitted' ? 'bg-amber-100 text-amber-700' :
                              itemStatus === 'draft' ? 'bg-gray-100 text-gray-600' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {itemStatus}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Tester: Bid Interface */}
      {user.role === 'tester' && !isAssigned && (job.status === 'open' || job.status === 'in_progress') && (
        <TesterBidInterface job={job} myBids={myBids} fetchData={fetchData} setError={setError} onWithdraw={handleWithdrawBid} />
      )}

      {/* Tester: My Bids Status */}
      {user.role === 'tester' && myBids.length > 0 && !isAssigned && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Your Bids</h2>
          <div className="space-y-3">
            {myBids.map((bid) => (
              <div key={bid.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                <div>
                  <span className="text-sm font-medium text-gray-900">${bid.bid_price.toFixed(2)}</span>
                  {bid.is_counter && <span className="text-xs text-amber-600 ml-2">(counter-offer)</span>}
                  {bid.message && <p className="text-xs text-gray-500 mt-0.5">{bid.message}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    bid.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    bid.status === 'accepted' ? 'bg-green-100 text-green-700' :
                    bid.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {bid.status}
                  </span>
                  {bid.status === 'pending' && (
                    <button onClick={() => handleWithdrawBid(bid.id)} className="text-xs text-gray-400 hover:text-red-500">Withdraw</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tester: Per-Item Submission Forms (after bid accepted + paid) */}
      {user.role === 'tester' && isAssigned && mySubmissions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Your Assigned Items ({mySubmissions.length})</h2>
          {job.roles?.map((role) => {
            const roleSubs = mySubmissions.filter((s) => s.role_id === role.id)
            if (roleSubs.length === 0) return null
            return (
              <div key={role.id}>
                <h3 className="text-sm font-semibold text-gray-500 mb-2">{role.name}</h3>
                <div className="space-y-3">
                  {roleSubs.map((sub) => (
                    <V2TesterSubmission key={sub.id} submission={sub} onUpdate={fetchData} setError={setError} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Builder: Bid Review Panel */}
      {user.role === 'builder' && bids.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Bids ({bids.length})</h2>
          <div className="space-y-3">
            {bids.map((bid) => (
              <div key={bid.id} className="border border-gray-100 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{bid.tester_name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        bid.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        bid.status === 'accepted' ? 'bg-green-100 text-green-700' :
                        bid.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {bid.status}
                      </span>
                      {bid.is_counter && <span className="text-xs text-amber-600">counter-offer</span>}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm">
                      <span>Bid: <strong className="text-gray-900">${bid.bid_price.toFixed(2)}</strong></span>
                      <span className="text-gray-400">vs proposed: ${bid.proposed_price.toFixed(2)}</span>
                      {bid.scope_role_id && <span className="text-xs text-gray-400">Role: {job.roles?.find((r) => r.id === bid.scope_role_id)?.name}</span>}
                    </div>
                    {bid.message && <p className="text-sm text-gray-500 mt-2">{bid.message}</p>}
                  </div>
                  {bid.status === 'pending' && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleAcceptBid(bid)}
                        className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 font-medium"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleRejectBid(bid.id)}
                        className="px-3 py-1.5 border border-red-300 text-red-600 text-sm rounded-lg hover:bg-red-50 font-medium"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                  {bid.status === 'accepted' && bid.payment_status === 'paid' && (
                    <span className="text-xs text-green-600 font-medium">Paid</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Builder: Per-Item Submission Review */}
      {user.role === 'builder' && submissions.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Submissions ({submissions.length})</h2>
          {job.roles?.map((role) => {
            const roleSubs = submissions.filter((s) => s.role_id === role.id)
            if (roleSubs.length === 0) return null
            return (
              <div key={role.id} className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 mb-2">{role.name}</h3>
                <div className="space-y-4">
                  {roleSubs.map((sub) => (
                    <BuilderSubmissionCard key={sub.id} submission={sub} onUpdate={fetchData} setError={setError} />
                  ))}
                </div>
              </div>
            )
          })}
          {/* Submissions without a role_id (shouldn't happen for v2 but safety) */}
          {submissions.filter((s) => !s.role_id).length > 0 && (
            <div className="space-y-4">
              {submissions.filter((s) => !s.role_id).map((sub) => (
                <BuilderSubmissionCard key={sub.id} submission={sub} onUpdate={fetchData} setError={setError} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============== Tester Bid Interface ==============

function TesterBidInterface({ job, myBids, fetchData, setError, onWithdraw }) {
  const [bidding, setBidding] = useState(null) // null, or { scope_role_id, scope_item_id, proposed_price }
  const [bidPrice, setBidPrice] = useState('')
  const [bidMessage, setBidMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const assignment = job.assignment_type
  const roles = job.roles || []

  const hasPendingBid = (roleId, itemId) => {
    return myBids.some((b) => b.status === 'pending' && (
      (assignment === 'per_job') ||
      (assignment === 'per_role' && b.scope_role_id === roleId) ||
      (assignment === 'per_item' && b.scope_item_id === itemId)
    ))
  }

  const startBid = (scopeRoleId, scopeItemId, proposedPrice) => {
    setBidding({ scope_role_id: scopeRoleId, scope_item_id: scopeItemId, proposed_price: proposedPrice })
    setBidPrice(proposedPrice.toString())
    setBidMessage('')
  }

  const submitBid = async () => {
    setSubmitting(true)
    setError('')
    try {
      await axios.post(`/api/jobs/${job.id}/bids`, {
        bid_price: parseFloat(bidPrice),
        message: bidMessage,
        scope_role_id: bidding.scope_role_id,
        scope_item_id: bidding.scope_item_id,
      })
      setBidding(null)
      fetchData()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit bid')
    } finally {
      setSubmitting(false)
    }
  }

  // Bid form modal
  if (bidding) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Place Your Bid</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1">Proposed price: <strong className="text-gray-900">${bidding.proposed_price.toFixed(2)}</strong></label>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 font-medium">$</span>
              <input
                type="number"
                min={1}
                step={0.01}
                className="w-40 px-3 py-2 border border-gray-300 rounded-lg text-lg font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                value={bidPrice}
                onChange={(e) => setBidPrice(e.target.value)}
              />
              {parseFloat(bidPrice) !== bidding.proposed_price && (
                <span className="text-xs text-amber-600 font-medium">Counter-offer</span>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Message (optional)</label>
            <textarea
              rows={2}
              maxLength={500}
              placeholder="Why should the builder pick you?"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={bidMessage}
              onChange={(e) => setBidMessage(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={submitBid}
              disabled={submitting || !bidPrice || parseFloat(bidPrice) <= 0}
              className="px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Bid'}
            </button>
            <button onClick={() => setBidding(null)} className="px-5 py-2.5 text-gray-500 hover:text-gray-700">Cancel</button>
          </div>
        </div>
      </div>
    )
  }

  // Bid buttons
  if (assignment === 'per_job') {
    const totalProposed = roles.reduce((s, r) => s + r.items.reduce((si, i) => si + i.proposed_price, 0), 0)
    const alreadyBid = hasPendingBid()
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Bid on entire job</h3>
            <p className="text-sm text-gray-500">Proposed: ${totalProposed.toFixed(2)} for all {roles.reduce((s, r) => s + r.items.length, 0)} items</p>
          </div>
          {alreadyBid ? (
            <span className="text-sm text-amber-600 font-medium">Bid pending</span>
          ) : (
            <button onClick={() => startBid(null, null, totalProposed)} className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 font-medium">
              Place Bid
            </button>
          )}
        </div>
      </div>
    )
  }

  if (assignment === 'per_role') {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4">Bid per role</h3>
        <div className="space-y-3">
          {roles.map((role) => {
            const roleTotal = role.items.reduce((s, i) => s + i.proposed_price, 0)
            const alreadyBid = hasPendingBid(role.id)
            return (
              <div key={role.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                <div>
                  <span className="font-medium text-gray-900">{role.name}</span>
                  <span className="text-sm text-gray-500 ml-2">({role.items.length} items, ${roleTotal.toFixed(2)} proposed)</span>
                </div>
                {alreadyBid ? (
                  <span className="text-sm text-amber-600 font-medium">Bid pending</span>
                ) : (
                  <button onClick={() => startBid(role.id, null, roleTotal)} className="px-3 py-1.5 bg-primary-600 text-white text-xs rounded-lg hover:bg-primary-700 font-medium">
                    Bid
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (assignment === 'per_item') {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4">Bid per item</h3>
        {roles.map((role) => (
          <div key={role.id} className="mb-4 last:mb-0">
            <p className="text-xs font-semibold text-gray-500 mb-2">{role.name}</p>
            <div className="space-y-2">
              {role.items.map((item) => {
                const alreadyBid = hasPendingBid(null, item.id)
                return (
                  <div key={item.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${SERVICE_COLORS[item.service_type]}`}>{item.service_type}</span>
                      <span className="text-sm text-gray-900">{item.title}</span>
                      <span className="text-sm text-gray-500">${item.proposed_price.toFixed(2)}</span>
                    </div>
                    {alreadyBid ? (
                      <span className="text-xs text-amber-600 font-medium">Bid pending</span>
                    ) : (
                      <button onClick={() => startBid(null, item.id, item.proposed_price)} className="px-3 py-1.5 bg-primary-600 text-white text-xs rounded-lg hover:bg-primary-700 font-medium">
                        Bid
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return null
}

// ============== V2 Tester Submission (per-item, service-type-specific) ==============

function V2TesterSubmission({ submission, onUpdate, setError }) {
  const [saving, setSaving] = useState(false)
  const serviceType = submission.service_type || 'test'
  const isEditable = submission.status === 'draft'

  // Form state
  const [form, setForm] = useState({
    overall_feedback: submission.overall_feedback || '',
    usability_score: submission.usability_score || null,
    suggestions: submission.suggestions || '',
    bug_reports: submission.bug_reports || [],
    document_content: submission.document_content || '',
    transcript: submission.transcript || '',
  })

  // Video state
  const [recordingState, setRecordingState] = useState('idle')
  const [mediaRecorder, setMediaRecorder] = useState(null)
  const [recordedBlob, setRecordedBlob] = useState(null)
  const [recordedUrl, setRecordedUrl] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [videoUrl, setVideoUrl] = useState(submission.video_url || null)

  const subStatusColors = {
    draft: 'bg-gray-100 text-gray-600',
    submitted: 'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { mediaSource: 'screen' }, audio: serviceType === 'voiceover' })
      const chunks = []
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' })
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunks, { type: 'video/webm' })
        setRecordedBlob(blob)
        setRecordedUrl(URL.createObjectURL(blob))
        setRecordingState('recorded')
      }
      stream.getVideoTracks()[0].onended = () => { if (recorder.state === 'recording') recorder.stop() }
      recorder.start()
      setMediaRecorder(recorder)
      setRecordingState('recording')
    } catch (err) {
      if (err.name !== 'NotAllowedError') setError('Failed to start recording')
    }
  }

  const stopRecording = () => { if (mediaRecorder?.state === 'recording') mediaRecorder.stop() }

  const handleUploadVideo = async () => {
    if (!recordedBlob) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', recordedBlob, 'recording.webm')
      const res = await axios.post(`/api/submissions/${submission.id}/upload-video`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      setVideoUrl(res.data.video_url)
      setRecordedBlob(null)
      setRecordedUrl(null)
      setRecordingState('idle')
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to upload video')
    } finally {
      setUploading(false)
    }
  }

  const discardRecording = () => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl)
    setRecordedBlob(null)
    setRecordedUrl(null)
    setRecordingState('idle')
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await axios.put(`/api/submissions/${submission.id}`, form)
      setError('')
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async () => {
    if (!confirm("Submit this item? You won't be able to edit after.")) return
    setSaving(true)
    try {
      await axios.put(`/api/submissions/${submission.id}`, form)
      await axios.post(`/api/submissions/${submission.id}/submit`)
      onUpdate()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit')
    } finally {
      setSaving(false)
    }
  }

  // Find item title from job context (passed via submission fields)
  const itemTitle = submission.job_title ? `${submission.job_title}` : ''

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded font-medium ${SERVICE_COLORS[serviceType]}`}>{serviceType}</span>
          <span className="text-sm font-medium text-gray-900">{submission.item_id ? `Item` : itemTitle}</span>
        </div>
        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${subStatusColors[submission.status]}`}>{submission.status}</span>
      </div>

      {submission.review_feedback && (
        <div className={`mb-4 border rounded-lg p-3 text-sm ${submission.status === 'approved' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <p className="font-medium text-sm mb-0.5">{submission.status === 'approved' ? 'Approved' : 'Rejected'}</p>
          <p className="text-gray-700">{submission.review_feedback}</p>
        </div>
      )}

      <div className="space-y-4">
        {/* Service-type-specific form */}
        {(serviceType === 'test' || !serviceType) && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Overall Feedback <span className="text-red-500">*</span></label>
              {isEditable ? (
                <textarea rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" value={form.overall_feedback} onChange={(e) => setForm({ ...form, overall_feedback: e.target.value })} placeholder="Describe your experience..." />
              ) : (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{form.overall_feedback}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Usability Score <span className="text-red-500">*</span></label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" disabled={!isEditable} onClick={() => setForm({ ...form, usability_score: n })} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${n <= (form.usability_score || 0) ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-400'} ${!isEditable ? 'cursor-default' : 'cursor-pointer hover:bg-gray-200'}`}>{n}</button>
                ))}
              </div>
            </div>
          </>
        )}

        {serviceType === 'record' && (
          <>
            {isEditable && !videoUrl && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Screen Recording <span className="text-red-500">*</span></label>
                {recordingState === 'idle' && (
                  <button type="button" onClick={startRecording} className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 font-medium">
                    <span className="w-3 h-3 rounded-full bg-red-500" />Start Recording
                  </button>
                )}
                {recordingState === 'recording' && (
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-2 text-sm text-red-600 font-medium"><span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />Recording...</span>
                    <button type="button" onClick={stopRecording} className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 font-medium">Stop</button>
                  </div>
                )}
                {recordingState === 'recorded' && (
                  <div className="space-y-3">
                    <video src={recordedUrl} controls className="w-full rounded-lg bg-black" style={{ maxHeight: '300px' }} />
                    <div className="flex gap-2">
                      <button type="button" onClick={handleUploadVideo} disabled={uploading} className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50">{uploading ? 'Uploading...' : 'Upload'}</button>
                      <button type="button" onClick={discardRecording} className="px-4 py-2 text-gray-500 text-sm">Discard</button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {videoUrl && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Screen Recording</label>
                <video src={videoUrl} controls className="w-full rounded-lg bg-black" style={{ maxHeight: '300px' }} />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Feedback</label>
              {isEditable ? (
                <textarea rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" value={form.overall_feedback} onChange={(e) => setForm({ ...form, overall_feedback: e.target.value })} placeholder="Written feedback about the recording..." />
              ) : (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{form.overall_feedback}</p>
              )}
            </div>
          </>
        )}

        {serviceType === 'document' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Documentation <span className="text-red-500">*</span></label>
            {isEditable ? (
              <textarea rows={8} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary-500" value={form.document_content} onChange={(e) => setForm({ ...form, document_content: e.target.value })} placeholder="Write step-by-step documentation of the user journey..." />
            ) : (
              <div className="bg-gray-50 rounded-lg p-4 text-sm font-mono whitespace-pre-wrap">{form.document_content}</div>
            )}
          </div>
        )}

        {serviceType === 'voiceover' && (
          <>
            {isEditable && !videoUrl && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Narrated Recording <span className="text-red-500">*</span></label>
                <p className="text-xs text-gray-400 mb-2">Record your screen with microphone enabled. Narrate your experience as you use the app.</p>
                {recordingState === 'idle' && (
                  <button type="button" onClick={startRecording} className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 font-medium">
                    <span className="w-3 h-3 rounded-full bg-red-500" />Start Narrated Recording
                  </button>
                )}
                {recordingState === 'recording' && (
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-2 text-sm text-red-600 font-medium"><span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />Recording...</span>
                    <button type="button" onClick={stopRecording} className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 font-medium">Stop</button>
                  </div>
                )}
                {recordingState === 'recorded' && (
                  <div className="space-y-3">
                    <video src={recordedUrl} controls className="w-full rounded-lg bg-black" style={{ maxHeight: '300px' }} />
                    <div className="flex gap-2">
                      <button type="button" onClick={handleUploadVideo} disabled={uploading} className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50">{uploading ? 'Uploading...' : 'Upload'}</button>
                      <button type="button" onClick={discardRecording} className="px-4 py-2 text-gray-500 text-sm">Discard</button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {videoUrl && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Narrated Recording</label>
                <video src={videoUrl} controls className="w-full rounded-lg bg-black" style={{ maxHeight: '300px' }} />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Transcript / Notes</label>
              {isEditable ? (
                <textarea rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" value={form.transcript} onChange={(e) => setForm({ ...form, transcript: e.target.value })} placeholder="Optional written transcript or notes..." />
              ) : (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{form.transcript || 'No transcript'}</p>
              )}
            </div>
          </>
        )}

        {/* Actions */}
        {isEditable && (
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={handleSave} disabled={saving} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            <button type="button" onClick={handleSubmit} disabled={saving} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium disabled:opacity-50">
              {saving ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ============== Bid Payment Form ==============

function BidPaymentForm({ bid, onSuccess }) {
  const stripe = useStripe()
  const elements = useElements()
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState('')

  const handlePay = async (e) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setPaying(true)
    setPayError('')

    const { error } = await stripe.confirmPayment({ elements, redirect: 'if_required' })
    if (error) {
      setPayError(error.message)
      setPaying(false)
      return
    }

    try {
      onSuccess()
    } catch (err) {
      setPayError('Payment confirmed but failed to update. Refresh the page.')
    } finally {
      setPaying(false)
    }
  }

  return (
    <form onSubmit={handlePay}>
      <PaymentElement />
      {payError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded mt-4">{payError}</div>}
      <button type="submit" disabled={!stripe || paying} className="w-full mt-5 px-5 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold disabled:opacity-50">
        {paying ? 'Processing...' : `Pay $${bid.total_charge?.toFixed(2)}`}
      </button>
    </form>
  )
}

// ============== V1 Builder Submission Card (unchanged) ==============

function BuilderSubmissionCard({ submission, onUpdate, setError }) {
  const [rejectFeedback, setRejectFeedback] = useState('')
  const [showReject, setShowReject] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [rating, setRating] = useState(0)
  const videoRef = useRef(null)

  const handleApprove = async () => {
    if (!confirm('Approve this submission? This will release payment to the tester.')) return
    setProcessing(true)
    try {
      await axios.post(`/api/submissions/${submission.id}/approve`, { feedback: '', rating: rating || null })
      onUpdate()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to approve')
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!rejectFeedback.trim()) { setError('Please provide feedback for the rejection'); return }
    if (!confirm('Reject this submission? The tester will see your feedback.')) return
    setProcessing(true)
    try {
      await axios.post(`/api/submissions/${submission.id}/reject`, { feedback: rejectFeedback })
      setShowReject(false)
      onUpdate()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reject')
    } finally {
      setProcessing(false)
    }
  }

  const handleTagSeek = (seconds) => {
    if (videoRef.current) { videoRef.current.currentTime = seconds; videoRef.current.play() }
  }

  const subStatusColors = {
    draft: 'bg-gray-100 text-gray-600',
    submitted: 'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">{submission.tester_name}</span>
          <span className="text-gray-400 text-sm">{submission.tester_email}</span>
          {submission.service_type && (
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${SERVICE_COLORS[submission.service_type] || 'bg-gray-100 text-gray-600'}`}>{submission.service_type}</span>
          )}
          {submission.payout_amount && <span className="text-xs text-gray-400">${submission.payout_amount.toFixed(2)}</span>}
        </div>
        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${subStatusColors[submission.status]}`}>{submission.status}</span>
      </div>

      {submission.status === 'draft' && (
        <p className="text-gray-400 italic">Tester is still working on their submission...</p>
      )}

      {submission.status !== 'draft' && (
        <>
          {submission.video_url && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-500 mb-2">Screen Recording</label>
              <video ref={videoRef} src={submission.video_url} controls className="w-full rounded-lg bg-black" style={{ maxHeight: '400px' }} />
            </div>
          )}

          {submission.document_content && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-500 mb-2">Documentation</label>
              <div className="bg-gray-50 rounded-lg p-4 text-sm font-mono whitespace-pre-wrap">{submission.document_content}</div>
            </div>
          )}

          {submission.transcript && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-500 mb-2">Transcript</label>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{submission.transcript}</p>
            </div>
          )}

          <div className="space-y-4">
            {submission.overall_feedback && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Overall Feedback</label>
                <p className="text-gray-700 whitespace-pre-wrap">{submission.overall_feedback}</p>
              </div>
            )}

            {submission.usability_score && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Usability Score</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span key={n} className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${n <= submission.usability_score ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-400'}`}>{n}</span>
                  ))}
                </div>
              </div>
            )}

            {submission.bug_reports?.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Bug Reports ({submission.bug_reports.length})</label>
                <div className="space-y-2">
                  {submission.bug_reports.map((bug, i) => (
                    <div key={i} className="bg-gray-50 border border-gray-100 rounded p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{bug.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${severityColors[bug.severity] || 'bg-gray-100 text-gray-600'}`}>{bug.severity}</span>
                      </div>
                      <p className="text-sm text-gray-600">{bug.description}</p>
                      {bug.steps_to_reproduce && <p className="text-xs text-gray-500 mt-1"><strong>Steps:</strong> {bug.steps_to_reproduce}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {submission.suggestions && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Suggestions</label>
                <p className="text-gray-700 whitespace-pre-wrap">{submission.suggestions}</p>
              </div>
            )}
          </div>

          {submission.video_url && (
            <VideoTagPanel submission={submission} onUpdate={onUpdate} setError={setError} onSeek={handleTagSeek} />
          )}

          {submission.review_feedback && (
            <div className="mt-4 bg-gray-50 border border-gray-200 rounded p-3">
              <label className="block text-xs font-medium text-gray-500 mb-1">Your Review Feedback</label>
              <p className="text-sm text-gray-700">{submission.review_feedback}</p>
            </div>
          )}

          {submission.builder_rating && (
            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-500 mb-1">Your Rating</label>
              <div className="flex">
                {[1, 2, 3, 4, 5].map((n) => (
                  <svg key={n} width="16" height="16" viewBox="0 0 24 24" fill={n <= submission.builder_rating ? '#f59e0b' : 'none'} stroke="#f59e0b" strokeWidth="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                ))}
              </div>
            </div>
          )}

          {submission.status === 'submitted' && (
            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rate this tester (optional)</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" onClick={() => setRating(rating === n ? 0 : n)} className="p-0.5">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill={n <= rating ? '#f59e0b' : 'none'} stroke="#f59e0b" strokeWidth="2" className="transition-colors">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </button>
                  ))}
                  {rating > 0 && <span className="text-sm text-gray-500 self-center ml-1">{rating}/5</span>}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <button onClick={handleApprove} disabled={processing} className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 font-medium disabled:opacity-50">Approve</button>
                {!showReject ? (
                  <button onClick={() => setShowReject(true)} className="px-4 py-2 bg-white border border-red-300 text-red-600 text-sm rounded-lg hover:bg-red-50 font-medium">Reject</button>
                ) : (
                  <div className="flex-1 space-y-2">
                    <textarea rows={2} placeholder="Explain why you're rejecting..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500" value={rejectFeedback} onChange={(e) => setRejectFeedback(e.target.value)} />
                    <div className="flex gap-2">
                      <button onClick={handleReject} disabled={processing} className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 font-medium disabled:opacity-50">Confirm Reject</button>
                      <button onClick={() => setShowReject(false)} className="px-4 py-2 text-gray-500 text-sm hover:text-gray-700">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ============== V1 Tester Submission (unchanged from original) ==============

function TesterSubmission({ submission, onUpdate, setError }) {
  const [form, setForm] = useState({
    overall_feedback: submission.overall_feedback || '',
    usability_score: submission.usability_score || null,
    suggestions: submission.suggestions || '',
    bug_reports: submission.bug_reports || [],
  })
  const [saving, setSaving] = useState(false)
  const [showBugForm, setShowBugForm] = useState(false)
  const [bugForm, setBugForm] = useState({ title: '', description: '', severity: 'medium', steps_to_reproduce: '' })
  const [recordingState, setRecordingState] = useState('idle')
  const [mediaRecorder, setMediaRecorder] = useState(null)
  const [recordedBlob, setRecordedBlob] = useState(null)
  const [recordedUrl, setRecordedUrl] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [videoUrl, setVideoUrl] = useState(submission.video_url || null)
  const videoRef = useRef(null)

  const isEditable = submission.status === 'draft'
  const supportsScreenRecording = typeof navigator !== 'undefined' && navigator.mediaDevices?.getDisplayMedia

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { mediaSource: 'screen' }, audio: true })
      const chunks = []
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' })
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunks, { type: 'video/webm' })
        setRecordedBlob(blob)
        setRecordedUrl(URL.createObjectURL(blob))
        setRecordingState('recorded')
      }
      stream.getVideoTracks()[0].onended = () => { if (recorder.state === 'recording') recorder.stop() }
      recorder.start()
      setMediaRecorder(recorder)
      setRecordingState('recording')
    } catch (err) {
      if (err.name !== 'NotAllowedError') setError('Failed to start screen recording')
    }
  }

  const stopRecording = () => { if (mediaRecorder?.state === 'recording') mediaRecorder.stop() }

  const handleUploadVideo = async () => {
    if (!recordedBlob) return
    setUploading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', recordedBlob, 'recording.webm')
      const res = await axios.post(`/api/submissions/${submission.id}/upload-video`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      setVideoUrl(res.data.video_url)
      setRecordedBlob(null)
      setRecordedUrl(null)
      setRecordingState('idle')
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to upload video')
    } finally {
      setUploading(false)
    }
  }

  const discardRecording = () => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl)
    setRecordedBlob(null)
    setRecordedUrl(null)
    setRecordingState('idle')
  }

  const handleTagSeek = (seconds) => {
    if (videoRef.current) { videoRef.current.currentTime = seconds; videoRef.current.play() }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await axios.put(`/api/submissions/${submission.id}`, form)
      setError('')
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async () => {
    if (!form.overall_feedback.trim()) { setError('Overall feedback is required'); return }
    if (!form.usability_score) { setError('Usability score is required'); return }
    if (!confirm("Submit your feedback? You won't be able to edit it after submission.")) return
    setSaving(true)
    try {
      await axios.put(`/api/submissions/${submission.id}`, form)
      await axios.post(`/api/submissions/${submission.id}/submit`)
      onUpdate()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit')
    } finally {
      setSaving(false)
    }
  }

  const addBug = () => {
    if (!bugForm.title.trim() || !bugForm.description.trim()) return
    setForm({ ...form, bug_reports: [...form.bug_reports, { ...bugForm }] })
    setBugForm({ title: '', description: '', severity: 'medium', steps_to_reproduce: '' })
    setShowBugForm(false)
  }

  const removeBug = (index) => {
    setForm({ ...form, bug_reports: form.bug_reports.filter((_, i) => i !== index) })
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">{isEditable ? 'Your Feedback' : 'Your Submission'}</h2>

      {submission.review_feedback && (
        <div className={`mb-6 border rounded-lg p-4 ${submission.status === 'approved' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <p className="text-sm font-medium mb-1">{submission.status === 'approved' ? 'Approved' : 'Rejected'} by builder</p>
          {submission.review_feedback && <p className="text-sm text-gray-700">{submission.review_feedback}</p>}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5">
        {isEditable && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Screen Recording</label>
            {!supportsScreenRecording ? (
              <p className="text-sm text-gray-400">Screen recording is not supported in this browser.</p>
            ) : videoUrl ? (
              <div>
                <video src={videoUrl} controls className="w-full rounded-lg bg-black" style={{ maxHeight: '360px' }} />
                <p className="text-xs text-green-600 mt-2 font-medium">Video uploaded successfully</p>
              </div>
            ) : recordingState === 'idle' ? (
              <button type="button" onClick={startRecording} className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 font-medium">
                <span className="w-3 h-3 rounded-full bg-red-500" />Start Screen Recording
              </button>
            ) : recordingState === 'recording' ? (
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-2 text-sm text-red-600 font-medium"><span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />Recording...</span>
                <button type="button" onClick={stopRecording} className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 font-medium">Stop Recording</button>
              </div>
            ) : recordingState === 'recorded' ? (
              <div className="space-y-3">
                <video src={recordedUrl} controls className="w-full rounded-lg bg-black" style={{ maxHeight: '360px' }} />
                <div className="flex gap-2">
                  <button type="button" onClick={handleUploadVideo} disabled={uploading} className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50">{uploading ? 'Uploading...' : 'Upload Recording'}</button>
                  <button type="button" onClick={discardRecording} className="px-4 py-2 text-gray-500 text-sm hover:text-gray-700">Discard</button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {!isEditable && videoUrl && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Screen Recording</label>
            <video ref={videoRef} src={videoUrl} controls className="w-full rounded-lg bg-black" style={{ maxHeight: '360px' }} />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Overall Feedback <span className="text-red-500">*</span></label>
          {isEditable ? (
            <textarea rows={4} placeholder="Describe your experience using the app..." className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" value={form.overall_feedback} onChange={(e) => setForm({ ...form, overall_feedback: e.target.value })} />
          ) : (
            <p className="text-gray-700 whitespace-pre-wrap">{form.overall_feedback}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Usability Score <span className="text-red-500">*</span></label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" disabled={!isEditable} onClick={() => setForm({ ...form, usability_score: n })} className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${n <= (form.usability_score || 0) ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'} ${!isEditable ? 'cursor-default' : 'cursor-pointer'}`}>{n}</button>
            ))}
            <span className="ml-2 text-sm text-gray-500 self-center">{form.usability_score ? ['', 'Poor', 'Below Average', 'Average', 'Good', 'Excellent'][form.usability_score] : 'Select a score'}</span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">Bug Reports ({form.bug_reports.length})</label>
            {isEditable && <button type="button" onClick={() => setShowBugForm(!showBugForm)} className="text-sm text-primary-600 hover:text-primary-700 font-medium">{showBugForm ? 'Cancel' : '+ Add Bug'}</button>}
          </div>
          {showBugForm && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-3 space-y-3">
              <input type="text" placeholder="Bug title" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" value={bugForm.title} onChange={(e) => setBugForm({ ...bugForm, title: e.target.value })} />
              <textarea rows={2} placeholder="Describe the bug..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" value={bugForm.description} onChange={(e) => setBugForm({ ...bugForm, description: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" value={bugForm.severity} onChange={(e) => setBugForm({ ...bugForm, severity: e.target.value })}>
                  {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <input type="text" placeholder="Steps to reproduce" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" value={bugForm.steps_to_reproduce} onChange={(e) => setBugForm({ ...bugForm, steps_to_reproduce: e.target.value })} />
              </div>
              <button type="button" onClick={addBug} className="px-4 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 font-medium">Add Bug</button>
            </div>
          )}
          {form.bug_reports.length === 0 ? (
            <p className="text-sm text-gray-400">No bugs reported yet.</p>
          ) : (
            <div className="space-y-2">
              {form.bug_reports.map((bug, i) => (
                <div key={i} className="bg-gray-50 border border-gray-100 rounded p-3 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{bug.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${severityColors[bug.severity] || 'bg-gray-100 text-gray-600'}`}>{bug.severity}</span>
                    </div>
                    <p className="text-sm text-gray-600">{bug.description}</p>
                    {bug.steps_to_reproduce && <p className="text-xs text-gray-500 mt-1"><strong>Steps:</strong> {bug.steps_to_reproduce}</p>}
                  </div>
                  {isEditable && <button type="button" onClick={() => removeBug(i)} className="text-red-400 hover:text-red-600 text-sm ml-3 shrink-0">Remove</button>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Suggestions</label>
          {isEditable ? (
            <textarea rows={3} placeholder="Any suggestions for improvement..." className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" value={form.suggestions} onChange={(e) => setForm({ ...form, suggestions: e.target.value })} />
          ) : (
            <p className="text-gray-700 whitespace-pre-wrap">{form.suggestions || 'None'}</p>
          )}
        </div>

        {videoUrl && !isEditable && (
          <VideoTagPanel submission={submission} onUpdate={onUpdate} setError={setError} onSeek={handleTagSeek} />
        )}

        {isEditable && (
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={handleSave} disabled={saving} className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50">{saving ? 'Saving...' : 'Save Draft'}</button>
            <button type="button" onClick={handleSubmit} disabled={saving} className="px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50">{saving ? 'Submitting...' : 'Submit Feedback'}</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ============== Video Tag Panel (shared) ==============

function VideoTagPanel({ submission, onUpdate, setError, onSeek }) {
  const [tags, setTags] = useState(submission.video_tags || [])
  const [adding, setAdding] = useState(false)
  const [tagForm, setTagForm] = useState({ start: '', end: '', tag_type: 'bug', note: '' })
  const [saving, setSaving] = useState(false)

  const handleAddTag = async () => {
    const startSec = parseTimeToSeconds(tagForm.start)
    const endSec = parseTimeToSeconds(tagForm.end)
    if (isNaN(startSec) || isNaN(endSec)) { setError('Enter times as M:SS (e.g. 1:30)'); return }
    if (endSec <= startSec) { setError('End time must be after start time'); return }

    const newTag = { start_seconds: startSec, end_seconds: endSec, tag_type: tagForm.tag_type, note: tagForm.note }
    const updatedTags = [...tags, newTag]

    setSaving(true)
    try {
      await axios.put(`/api/submissions/${submission.id}/video-tags`, { video_tags: updatedTags })
      setTags(updatedTags)
      setTagForm({ start: '', end: '', tag_type: 'bug', note: '' })
      setAdding(false)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save tag')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveTag = async (index) => {
    const updatedTags = tags.filter((_, i) => i !== index)
    setSaving(true)
    try {
      await axios.put(`/api/submissions/${submission.id}/video-tags`, { video_tags: updatedTags })
      setTags(updatedTags)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to remove tag')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700">Video Tags ({tags.length})</label>
        <button type="button" onClick={() => setAdding(!adding)} className="text-sm text-primary-600 hover:text-primary-700 font-medium">{adding ? 'Cancel' : '+ Add Tag'}</button>
      </div>
      {adding && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-3 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Start (M:SS)</label>
              <input type="text" placeholder="0:00" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" value={tagForm.start} onChange={(e) => setTagForm({ ...tagForm, start: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">End (M:SS)</label>
              <input type="text" placeholder="0:30" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" value={tagForm.end} onChange={(e) => setTagForm({ ...tagForm, end: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Type</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" value={tagForm.tag_type} onChange={(e) => setTagForm({ ...tagForm, tag_type: e.target.value })}>
                <option value="bug">Bug</option>
                <option value="ux-issue">UX Issue</option>
                <option value="training-clip">Training Clip</option>
                <option value="marketing-clip">Marketing Clip</option>
              </select>
            </div>
          </div>
          <input type="text" placeholder="Note (optional)" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" value={tagForm.note} onChange={(e) => setTagForm({ ...tagForm, note: e.target.value })} />
          <button type="button" onClick={handleAddTag} disabled={saving} className="px-4 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50">{saving ? 'Saving...' : 'Add Tag'}</button>
        </div>
      )}
      {tags.length === 0 ? (
        <p className="text-sm text-gray-400">No video tags yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, i) => (
            <button key={i} type="button" onClick={() => onSeek(tag.start_seconds)} className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border cursor-pointer hover:opacity-80 transition-opacity ${TAG_COLORS[tag.tag_type] || 'bg-gray-100 text-gray-600 border-gray-200'}`} title={tag.note || tag.tag_type}>
              <span>{formatTime(tag.start_seconds)}-{formatTime(tag.end_seconds)}</span>
              <span className="opacity-70">{tag.tag_type.replace('-', ' ')}</span>
              {tag.note && <span className="max-w-[120px] truncate">{tag.note}</span>}
              <span onClick={(e) => { e.stopPropagation(); handleRemoveTag(i) }} className="ml-1 opacity-50 hover:opacity-100">&times;</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
