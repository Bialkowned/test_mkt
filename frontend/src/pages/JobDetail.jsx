import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'

const SEVERITIES = ['low', 'medium', 'high', 'critical']
const severityColors = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
}

export default function JobDetail({ user }) {
  const { jobId } = useParams()
  const [job, setJob] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [mySubmission, setMySubmission] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchData()
  }, [jobId])

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

  const isClaimed = job.assigned_testers?.includes(user.email)
  const canClaim = user.role === 'tester' && !isClaimed && (job.status === 'open' || job.status === 'in_progress') && (job.assigned_testers?.length || 0) < job.max_testers

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link to="/jobs" className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block">Back to Jobs</Link>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">{error}</div>}

      {/* Job Header */}
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

        {/* Charge breakdown for builder */}
        {user.role === 'builder' && job.total_charge > 0 && (
          <div className="mt-5 bg-gray-50 rounded-lg p-4 text-sm space-y-1.5">
            <div className="flex justify-between text-gray-600">
              <span>Payout per tester</span>
              <span>${job.payout_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Testers</span>
              <span>{job.max_testers}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Platform fee (15%)</span>
              <span>${job.platform_fee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold text-gray-900 pt-1.5 border-t border-gray-200">
              <span>Total charged</span>
              <span>${job.total_charge.toFixed(2)}</span>
            </div>
          </div>
        )}

        {canClaim && (
          <button
            onClick={handleClaim}
            className="mt-6 px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
          >
            Claim This Job
          </button>
        )}
      </div>

      {/* Builder: Submissions List */}
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

      {/* Tester: Submission Form or Read-Only */}
      {user.role === 'tester' && isClaimed && mySubmission && (
        <TesterSubmission submission={mySubmission} onUpdate={fetchData} setError={setError} />
      )}
    </div>
  )
}

function BuilderSubmissionCard({ submission, onUpdate, setError }) {
  const [rejectFeedback, setRejectFeedback] = useState('')
  const [showReject, setShowReject] = useState(false)
  const [processing, setProcessing] = useState(false)

  const handleApprove = async () => {
    if (!confirm('Approve this submission? This will release payment to the tester.')) return
    setProcessing(true)
    try {
      await axios.post(`/api/submissions/${submission.id}/approve`, { feedback: '' })
      onUpdate()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to approve')
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!rejectFeedback.trim()) {
      setError('Please provide feedback for the rejection')
      return
    }
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

  const subStatusColors = {
    draft: 'bg-gray-100 text-gray-600',
    submitted: 'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="font-medium text-gray-900">{submission.tester_name}</span>
          <span className="text-gray-400 text-sm ml-2">{submission.tester_email}</span>
        </div>
        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${subStatusColors[submission.status]}`}>
          {submission.status}
        </span>
      </div>

      {submission.status === 'draft' && (
        <p className="text-gray-400 italic">Tester is still working on their submission...</p>
      )}

      {submission.status !== 'draft' && (
        <>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Overall Feedback</label>
              <p className="text-gray-700 whitespace-pre-wrap">{submission.overall_feedback}</p>
            </div>

            {submission.usability_score && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Usability Score</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span key={n} className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${n <= submission.usability_score ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                      {n}
                    </span>
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
                        <span className={`text-xs px-2 py-0.5 rounded-full ${severityColors[bug.severity] || 'bg-gray-100 text-gray-600'}`}>
                          {bug.severity}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{bug.description}</p>
                      {bug.steps_to_reproduce && (
                        <p className="text-xs text-gray-500 mt-1"><strong>Steps:</strong> {bug.steps_to_reproduce}</p>
                      )}
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

          {submission.review_feedback && (
            <div className="mt-4 bg-gray-50 border border-gray-200 rounded p-3">
              <label className="block text-xs font-medium text-gray-500 mb-1">Your Review Feedback</label>
              <p className="text-sm text-gray-700">{submission.review_feedback}</p>
            </div>
          )}

          {submission.status === 'submitted' && (
            <div className="mt-6 flex items-start gap-3">
              <button
                onClick={handleApprove}
                disabled={processing}
                className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
              >
                Approve
              </button>
              {!showReject ? (
                <button
                  onClick={() => setShowReject(true)}
                  className="px-4 py-2 bg-white border border-red-300 text-red-600 text-sm rounded-lg hover:bg-red-50 font-medium"
                >
                  Reject
                </button>
              ) : (
                <div className="flex-1 space-y-2">
                  <textarea
                    rows={2}
                    placeholder="Explain why you're rejecting this submission..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    value={rejectFeedback}
                    onChange={(e) => setRejectFeedback(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleReject}
                      disabled={processing}
                      className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 font-medium disabled:opacity-50"
                    >
                      Confirm Reject
                    </button>
                    <button
                      onClick={() => setShowReject(false)}
                      className="px-4 py-2 text-gray-500 text-sm hover:text-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

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

  const isEditable = submission.status === 'draft'
  const isSubmitted = submission.status !== 'draft'

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
    if (!form.overall_feedback.trim()) {
      setError('Overall feedback is required')
      return
    }
    if (!form.usability_score) {
      setError('Usability score is required')
      return
    }
    if (!confirm('Submit your feedback? You won\'t be able to edit it after submission.')) return

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
      <h2 className="text-xl font-bold text-gray-900 mb-4">
        {isEditable ? 'Your Feedback' : 'Your Submission'}
      </h2>

      {submission.review_feedback && (
        <div className={`mb-6 border rounded-lg p-4 ${submission.status === 'approved' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <p className="text-sm font-medium mb-1">{submission.status === 'approved' ? 'Approved' : 'Rejected'} by builder</p>
          {submission.review_feedback && <p className="text-sm text-gray-700">{submission.review_feedback}</p>}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5">
        {/* Overall Feedback */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Overall Feedback <span className="text-red-500">*</span>
          </label>
          {isEditable ? (
            <textarea
              rows={4}
              placeholder="Describe your experience using the app..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={form.overall_feedback}
              onChange={(e) => setForm({ ...form, overall_feedback: e.target.value })}
            />
          ) : (
            <p className="text-gray-700 whitespace-pre-wrap">{form.overall_feedback}</p>
          )}
        </div>

        {/* Usability Score */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Usability Score <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                disabled={!isEditable}
                onClick={() => setForm({ ...form, usability_score: n })}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  n <= (form.usability_score || 0)
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                } ${!isEditable ? 'cursor-default' : 'cursor-pointer'}`}
              >
                {n}
              </button>
            ))}
            <span className="ml-2 text-sm text-gray-500 self-center">
              {form.usability_score ? ['', 'Poor', 'Below Average', 'Average', 'Good', 'Excellent'][form.usability_score] : 'Select a score'}
            </span>
          </div>
        </div>

        {/* Bug Reports */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">Bug Reports ({form.bug_reports.length})</label>
            {isEditable && (
              <button
                type="button"
                onClick={() => setShowBugForm(!showBugForm)}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                {showBugForm ? 'Cancel' : '+ Add Bug'}
              </button>
            )}
          </div>

          {showBugForm && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-3 space-y-3">
              <div>
                <input
                  type="text"
                  placeholder="Bug title"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                  value={bugForm.title}
                  onChange={(e) => setBugForm({ ...bugForm, title: e.target.value })}
                />
              </div>
              <div>
                <textarea
                  rows={2}
                  placeholder="Describe the bug..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                  value={bugForm.description}
                  onChange={(e) => setBugForm({ ...bugForm, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                    value={bugForm.severity}
                    onChange={(e) => setBugForm({ ...bugForm, severity: e.target.value })}
                  >
                    {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Steps to reproduce"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                    value={bugForm.steps_to_reproduce}
                    onChange={(e) => setBugForm({ ...bugForm, steps_to_reproduce: e.target.value })}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={addBug}
                className="px-4 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 font-medium"
              >
                Add Bug
              </button>
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
                      <span className={`text-xs px-2 py-0.5 rounded-full ${severityColors[bug.severity] || 'bg-gray-100 text-gray-600'}`}>
                        {bug.severity}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{bug.description}</p>
                    {bug.steps_to_reproduce && (
                      <p className="text-xs text-gray-500 mt-1"><strong>Steps:</strong> {bug.steps_to_reproduce}</p>
                    )}
                  </div>
                  {isEditable && (
                    <button
                      type="button"
                      onClick={() => removeBug(i)}
                      className="text-red-400 hover:text-red-600 text-sm ml-3 shrink-0"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Suggestions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Suggestions</label>
          {isEditable ? (
            <textarea
              rows={3}
              placeholder="Any suggestions for improvement..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={form.suggestions}
              onChange={(e) => setForm({ ...form, suggestions: e.target.value })}
            />
          ) : (
            <p className="text-gray-700 whitespace-pre-wrap">{form.suggestions || 'None'}</p>
          )}
        </div>

        {/* Actions */}
        {isEditable && (
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50"
            >
              {saving ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
