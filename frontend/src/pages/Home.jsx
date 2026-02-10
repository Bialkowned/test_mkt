import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import axios from 'axios'

const SERVICE_TYPE_COLORS = {
  test: 'bg-blue-100 text-blue-700',
  record: 'bg-purple-100 text-purple-700',
  document: 'bg-emerald-100 text-emerald-700',
  voiceover: 'bg-amber-100 text-amber-700',
}

export default function Home({ user }) {
  const [stats, setStats] = useState(null)
  const [publicJobs, setPublicJobs] = useState([])
  const [jobFilter, setJobFilter] = useState('All')
  const [serviceFilter, setServiceFilter] = useState('All')

  useEffect(() => {
    axios.get('/api/stats').then((r) => setStats(r.data)).catch(() => {})
    axios.get('/api/jobs/public').then((r) => setPublicJobs(r.data)).catch(() => {})
  }, [])

  const categories = ['All', ...new Set(publicJobs.map((j) => j.category).filter(Boolean))]
  const allServiceTypes = [...new Set(publicJobs.flatMap((j) => j.service_types || []))]

  let filteredJobs = publicJobs
  if (jobFilter !== 'All') filteredJobs = filteredJobs.filter((j) => j.category === jobFilter)
  if (serviceFilter !== 'All') filteredJobs = filteredJobs.filter((j) => j.service_types?.includes(serviceFilter))

  return (
    <div>
      {/* Hero — deep indigo background with grid pattern */}
      <section className="relative bg-gray-900 overflow-hidden">
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.07]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />
        {/* Accent glow */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary-500 rounded-full blur-[180px] opacity-20 -translate-y-1/2 translate-x-1/4" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/20 text-primary-300 text-xs font-semibold tracking-wide uppercase mb-6 border border-primary-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse" />
                Real payments — testers get the full listed payout
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight leading-[1.15]">
                Real feedback from real users,
                <span className="text-primary-400"> before launch.</span>
              </h1>
              <p className="mt-5 text-lg text-gray-400 max-w-lg leading-relaxed">
                Connect with testers who walk through your app and report
                what's broken, confusing, or missing — structured bug reports,
                usability scores, and actionable suggestions.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                {user ? (
                  <Link to="/dashboard" className="px-6 py-3 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-400 transition-colors">
                    Go to Dashboard
                  </Link>
                ) : (
                  <>
                    <Link to="/register" className="px-6 py-3 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-400 transition-colors">
                      Get Started Free
                    </Link>
                    <Link to="/login" className="px-6 py-3 bg-white/10 border border-white/20 text-white rounded-lg font-medium hover:bg-white/20 transition-colors">
                      Sign In
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Browser mockup illustration */}
            <div className="hidden lg:block">
              <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-2xl overflow-hidden">
                <div className="flex items-center gap-1.5 px-4 py-3 bg-gray-800 border-b border-gray-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                  <span className="ml-3 text-xs text-gray-500 bg-gray-700/50 px-3 py-0.5 rounded">peertesthub.com/dashboard</span>
                </div>
                <div className="p-5 space-y-4">
                  {/* Mini dashboard mockup */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Active Jobs', val: '4', color: 'text-primary-400' },
                      { label: 'Pending Reviews', val: '2', color: 'text-amber-400' },
                      { label: 'Completed', val: '12', color: 'text-green-400' },
                    ].map((s) => (
                      <div key={s.label} className="bg-gray-700/50 rounded-lg p-3">
                        <p className={`text-xl font-bold ${s.color}`}>{s.val}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  {/* Fake submission rows */}
                  <div className="space-y-2">
                    {[
                      { name: 'Sarah K.', status: 'approved', statusColor: 'bg-green-500/20 text-green-400' },
                      { name: 'Marcus T.', status: 'submitted', statusColor: 'bg-amber-500/20 text-amber-400' },
                      { name: 'Priya M.', status: 'in progress', statusColor: 'bg-primary-500/20 text-primary-400' },
                    ].map((row) => (
                      <div key={row.name} className="flex items-center justify-between bg-gray-700/30 rounded-lg px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-gray-600 flex items-center justify-center text-xs text-gray-300 font-medium">
                            {row.name.split(' ').map(w => w[0]).join('')}
                          </div>
                          <span className="text-sm text-gray-300">{row.name}</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${row.statusColor}`}>{row.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Open Jobs Board */}
      {publicJobs.length > 0 && (
        <section className="bg-white border-b border-gray-100">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Open Jobs</h2>
              <p className="text-gray-500 mt-2">Browse available testing jobs. Sign up to start earning.</p>
            </div>

            {categories.length > 2 && (
              <div className="flex flex-wrap justify-center gap-2 mb-4">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setJobFilter(cat)}
                    className={`px-3.5 py-1.5 text-sm rounded-full font-medium transition-colors ${
                      jobFilter === cat
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {allServiceTypes.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mb-8">
                <button
                  onClick={() => setServiceFilter('All')}
                  className={`px-3.5 py-1.5 text-sm rounded-full font-medium transition-colors ${
                    serviceFilter === 'All'
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  All Services
                </button>
                {allServiceTypes.map((st) => (
                  <button
                    key={st}
                    onClick={() => setServiceFilter(st)}
                    className={`px-3.5 py-1.5 text-sm rounded-full font-medium capitalize transition-colors ${
                      serviceFilter === st
                        ? 'bg-gray-900 text-white'
                        : `${SERVICE_TYPE_COLORS[st] || 'bg-gray-100 text-gray-600'} hover:opacity-80`
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredJobs.slice(0, 9).map((job) => {
                const isV2 = !!job.service_types?.length || !!job.roles_count
                return (
                  <div key={job.id} className="bg-gray-50 border border-gray-200 rounded-lg p-5 flex flex-col">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 text-sm leading-tight">{job.title}</h3>
                      {job.category && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 font-medium shrink-0 ml-2">
                          {job.category}
                        </span>
                      )}
                    </div>
                    {job.project_name && (
                      <p className="text-xs text-gray-400 mb-2">{job.project_name}</p>
                    )}
                    <p className="text-sm text-gray-500 mb-3 flex-1 line-clamp-2">{job.description}</p>

                    {isV2 && job.service_types?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {job.service_types.map((st) => (
                          <span key={st} className={`text-xs font-medium px-2 py-0.5 rounded-full ${SERVICE_TYPE_COLORS[st] || 'bg-gray-100 text-gray-600'}`}>
                            {st}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                      {isV2 ? (
                        <>
                          <span className="font-semibold text-gray-900 text-base">
                            {job.price_range
                              ? job.price_range.min === job.price_range.max
                                ? `$${job.price_range.min}`
                                : `$${job.price_range.min}-$${job.price_range.max}`
                              : 'Bid'}
                          </span>
                          <span>{job.roles_count} role{job.roles_count !== 1 ? 's' : ''}</span>
                          <span>{job.items_count} item{job.items_count !== 1 ? 's' : ''}</span>
                        </>
                      ) : (
                        <>
                          <span className="font-semibold text-gray-900 text-base">${job.payout_amount}</span>
                          <span>{job.estimated_time_minutes} min</span>
                          <span>{job.slots_remaining} slot{job.slots_remaining !== 1 ? 's' : ''} left</span>
                        </>
                      )}
                    </div>
                    {user?.role === 'tester' ? (
                      <Link
                        to={`/jobs/${job.id}`}
                        className={`text-center px-4 py-2 text-white text-sm rounded-lg font-medium ${
                          isV2
                            ? 'bg-indigo-600 hover:bg-indigo-700'
                            : 'bg-primary-600 hover:bg-primary-700'
                        }`}
                      >
                        {isV2 ? 'View & Bid' : 'View Job'}
                      </Link>
                    ) : (
                      <Link
                        to="/register"
                        className="text-center px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 font-medium"
                      >
                        Sign up to claim
                      </Link>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* What you get — warm off-white with stronger cards */}
      <section className="bg-stone-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-gray-900">What you get from each test</h2>
            <p className="text-gray-500 mt-2">Every submission follows the same structured format so you can compare across testers.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Mock submission preview */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-primary-600 px-5 py-3 flex items-center justify-between">
                <span className="text-sm font-medium text-white">Sample submission</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-white font-medium">approved</span>
              </div>
              <div className="px-5 py-4 space-y-4 text-sm">
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Overall Feedback</p>
                  <p className="text-gray-700">Signup flow was smooth, but the dashboard took 4+ seconds to load after login. The "Create Project" button wasn't visible without scrolling on mobile. Settings page threw a 500 error when I tried to change my email.</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Usability Score</p>
                  <div className="flex gap-1">
                    {[1, 2, 3].map((n) => (
                      <span key={n} className="w-7 h-7 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs font-bold">{n}</span>
                    ))}
                    {[4, 5].map((n) => (
                      <span key={n} className="w-7 h-7 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-xs font-bold">{n}</span>
                    ))}
                    <span className="text-gray-500 text-xs ml-2 self-center">3/5 — Average</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Bug Reports (2)</p>
                  <div className="space-y-1.5">
                    <div className="bg-red-50 rounded-lg px-3 py-2 border border-red-200">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800">Settings 500 error</span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-red-200 text-red-700">critical</span>
                      </div>
                      <p className="text-gray-500 text-xs mt-0.5">Changing email on /settings returns server error</p>
                    </div>
                    <div className="bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800">Mobile layout overflow</span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-amber-200 text-amber-700">medium</span>
                      </div>
                      <p className="text-gray-500 text-xs mt-0.5">CTA button hidden below fold on iPhone SE</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Explanation */}
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary-600 flex items-center justify-center shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Structured feedback, not essays</h3>
                  <p className="text-sm text-gray-600">
                    Testers write about their actual experience using your app — what worked, what didn't,
                    and where they got stuck. You define the user journey they should follow.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Usability scores you can track</h3>
                  <p className="text-sm text-gray-600">
                    Every submission includes a 1-5 usability rating. With multiple testers per job,
                    you get a real signal on how intuitive your app is — not just one person's opinion.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-red-500 flex items-center justify-center shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Bug reports with severity levels</h3>
                  <p className="text-sm text-gray-600">
                    Testers log individual bugs with titles, descriptions, severity (low/medium/high/critical),
                    and reproduction steps. Prioritize fixes before your real users hit them.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-green-600 flex items-center justify-center shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Approve or reject with feedback</h3>
                  <p className="text-sm text-gray-600">
                    Review each submission and approve (releasing payment) or reject with written feedback.
                    No payment for low-effort submissions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Builders vs Testers — on white with stronger card colors */}
      <section className="bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-gray-900">How it works</h2>
            <p className="text-gray-500 mt-2">Two sides of the same platform. Pick your role.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-primary-600 rounded-xl p-8 text-white">
              <p className="text-xs font-bold uppercase tracking-widest text-primary-200 mb-3">For Builders</p>
              <h3 className="text-xl font-bold mb-5">Ship with fewer blind spots</h3>
              <ul className="space-y-4 text-sm text-primary-100">
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-white/20 text-white flex items-center justify-center text-xs font-bold shrink-0">1</span>
                  <span><strong className="text-white">Create a project</strong> — add your app's URL, description, and category.</span>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-white/20 text-white flex items-center justify-center text-xs font-bold shrink-0">2</span>
                  <span><strong className="text-white">Define a test job</strong> — describe the user journey, set payout ($10-$1,000), choose how many testers (1-10).</span>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-white/20 text-white flex items-center justify-center text-xs font-bold shrink-0">3</span>
                  <span><strong className="text-white">Testers claim your job</strong> — they walk through your app and submit structured feedback.</span>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-white/20 text-white flex items-center justify-center text-xs font-bold shrink-0">4</span>
                  <span><strong className="text-white">Review and approve</strong> — release payment for good work, or reject with an explanation.</span>
                </li>
              </ul>
              <p className="mt-6 text-sm text-primary-200">
                Most jobs get claimed within hours. You set the price and scope.
              </p>
            </div>

            <div className="bg-gray-900 rounded-xl p-8 text-white">
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-3">For Testers</p>
              <h3 className="text-xl font-bold mb-5">Get paid to test real apps</h3>
              <ul className="space-y-4 text-sm text-gray-400">
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0">1</span>
                  <span><strong className="text-white">Browse available jobs</strong> — see what apps need testing, payout amounts, and time estimates.</span>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0">2</span>
                  <span><strong className="text-white">Claim a job</strong> — reserve your spot. Each job has limited tester slots.</span>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0">3</span>
                  <span><strong className="text-white">Test and report</strong> — follow the builder's instructions, write feedback, log bugs, rate usability.</span>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0">4</span>
                  <span><strong className="text-white">Get paid on approval</strong> — the builder approves, you earn the full listed payout.</span>
                </li>
              </ul>
              <p className="mt-6 text-sm text-gray-500">
                No special skills required. Use an app, write about it, get paid.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Live stats strip */}
      {stats && (stats.total_users > 0 || stats.open_jobs > 0) && (
        <section className="bg-primary-600">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex flex-wrap justify-center gap-12 text-center">
              <div>
                <p className="text-3xl font-bold text-white">{stats.builders}</p>
                <p className="text-sm text-primary-200">Builders</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{stats.testers}</p>
                <p className="text-sm text-primary-200">Testers</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{stats.total_projects}</p>
                <p className="text-sm text-primary-200">Projects</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{stats.open_jobs}</p>
                <p className="text-sm text-primary-200">Open Jobs</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* FAQ — slate background, not pure black */}
      <section className="bg-gray-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-white">Questions & Answers</h2>
            <p className="text-gray-400 mt-2">Everything you need to know before getting started.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-primary-400 mb-5">Pricing & Payments</p>
              <div className="space-y-6">
                <FaqItem
                  q="How much does it cost for builders?"
                  a="You set your own payout per tester ($1-$1,000). We add a 15% platform fee on top — so if you set a $50 payout for 2 testers, you pay $115 total ($100 in payouts + $15 fee). Testers receive the full listed amount."
                />
                <FaqItem
                  q="How much can testers earn?"
                  a="Depends on the job. A quick 10-minute signup test might pay $5-$10, while a thorough 60-minute walkthrough could pay $30-$50. You see the exact payout before you claim. You get the full listed amount — no deductions."
                />
                <FaqItem
                  q="How do payments work?"
                  a="Builders pay via Stripe when creating a job. Funds are held until you approve submissions. Testers receive payouts through Stripe Connect — set it up once in Settings and get paid automatically on approval."
                />
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-primary-400 mb-5">How It Works</p>
              <div className="space-y-6">
                <FaqItem
                  q="What if a tester submits low-effort feedback?"
                  a="Builders review every submission before approving. If the feedback doesn't meet the job's requirements, the builder rejects it with an explanation. No payment for bad work."
                />
                <FaqItem
                  q="What kinds of apps can be tested?"
                  a="Anything with a URL — SaaS, e-commerce, mobile web, marketing sites, API docs, dev tools. If it opens in a browser, it can be tested."
                />
                <FaqItem
                  q="How many testers can I get per job?"
                  a="Between 1 and 10. More testers = more perspectives but higher cost. Start with 2-3 for a good signal."
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      {!user && (
        <section className="relative bg-gray-900 overflow-hidden">
          <div className="absolute inset-0 opacity-[0.05]" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }} />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary-500 rounded-full blur-[160px] opacity-15 translate-y-1/2 -translate-x-1/4" />
          <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
            <h2 className="text-2xl font-bold text-white mb-3">Ready to get real feedback?</h2>
            <p className="text-gray-400 mb-8">Create a free account as a builder or tester. Builders only pay when creating jobs.</p>
            <Link
              to="/register"
              className="inline-block px-8 py-3 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-400 transition-colors"
            >
              Get Started Free
            </Link>
          </div>
        </section>
      )}
    </div>
  )
}

function FaqItem({ q, a }) {
  return (
    <div>
      <h3 className="font-semibold text-white mb-1.5">{q}</h3>
      <p className="text-sm text-gray-400 leading-relaxed">{a}</p>
    </div>
  )
}
