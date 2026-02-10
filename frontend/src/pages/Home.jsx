import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import axios from 'axios'

export default function Home({ user }) {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    axios.get('/api/stats').then((r) => setStats(r.data)).catch(() => {})
  }, [])

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-50 via-white to-blue-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-14">
          <div className="inline-block px-3 py-1 rounded-full bg-primary-100 text-primary-700 text-xs font-semibold tracking-wide uppercase mb-5">
            Beta — free for builders & testers
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight leading-tight">
            Real feedback from real users,<br />before your users find the problems.
          </h1>
          <p className="mt-5 text-lg text-gray-600 max-w-2xl">
            PeerTest Hub connects indie builders with testers who walk through your app and report
            what's broken, confusing, or missing. You get structured bug reports, usability scores,
            and actionable suggestions — not vague opinions.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {user ? (
              <Link to="/dashboard" className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 shadow-sm shadow-primary-200">
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link to="/register" className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 shadow-sm shadow-primary-200">
                  Create an Account
                </Link>
                <Link to="/login" className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50">
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* What you actually get */}
      <section className="bg-white border-t border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">What you get from each test</h2>
          <p className="text-gray-500 mb-10">Every submission follows the same structured format so you can compare across testers.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Mock submission preview */}
            <div className="border border-primary-200 rounded-lg overflow-hidden shadow-sm">
              <div className="bg-primary-50 border-b border-primary-200 px-5 py-3 flex items-center justify-between">
                <span className="text-sm font-medium text-primary-800">Sample submission</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">approved</span>
              </div>
              <div className="px-5 py-4 space-y-4 text-sm bg-white">
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
                    <div className="bg-red-50 rounded px-3 py-2 border border-red-100">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800">Settings 500 error</span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-600">critical</span>
                      </div>
                      <p className="text-gray-500 text-xs mt-0.5">Changing email on /settings returns server error</p>
                    </div>
                    <div className="bg-amber-50 rounded px-3 py-2 border border-amber-100">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800">Mobile layout overflow</span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-600">medium</span>
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
                <div className="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-primary-600" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
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
                <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-amber-600" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Usability scores you can track</h3>
                  <p className="text-sm text-gray-600">
                    Every submission includes a 1–5 usability rating. With multiple testers per job,
                    you get a real signal on how intuitive your app is — not just one person's opinion.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-red-500" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Bug reports with severity levels</h3>
                  <p className="text-sm text-gray-600">
                    Testers log individual bugs with titles, descriptions, severity (low/medium/high/critical),
                    and reproduction steps. You can prioritize fixes before your real users hit them.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-green-600" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Approve or reject with feedback</h3>
                  <p className="text-sm text-gray-600">
                    You review each submission and approve (releasing payment) or reject with written feedback.
                    No payment for low-effort submissions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Two-column: Builders vs Testers */}
      <section className="border-t border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-8">
              <p className="text-xs font-bold uppercase tracking-widest text-primary-600 mb-3">For Builders</p>
              <h3 className="text-xl font-bold text-gray-900 mb-5">Ship with fewer blind spots</h3>
              <ul className="space-y-3.5 text-sm text-gray-600">
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs font-bold shrink-0">1</span>
                  <span><strong className="text-gray-900">Create a project</strong> — add your app's URL, description, and category.</span>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs font-bold shrink-0">2</span>
                  <span><strong className="text-gray-900">Define a test job</strong> — describe the user journey to test, set the payout ($10–$1,000), and choose how many testers you want (1–10).</span>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs font-bold shrink-0">3</span>
                  <span><strong className="text-gray-900">Testers claim your job</strong> — they walk through your app following your instructions and submit structured feedback.</span>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs font-bold shrink-0">4</span>
                  <span><strong className="text-gray-900">Review and approve</strong> — read their feedback, bug reports, and scores. Approve to release payment, or reject with an explanation.</span>
                </li>
              </ul>
              <p className="mt-5 text-sm text-gray-500">
                Most jobs get claimed within hours. You set the price and the scope — nothing happens until you approve.
              </p>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-8">
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-3">For Testers</p>
              <h3 className="text-xl font-bold text-gray-900 mb-5">Get paid to use apps and give honest feedback</h3>
              <ul className="space-y-3.5 text-sm text-gray-600">
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">1</span>
                  <span><strong className="text-gray-900">Browse available jobs</strong> — see what apps need testing, how much they pay, and how long they'll take.</span>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">2</span>
                  <span><strong className="text-gray-900">Claim a job</strong> — reserve your spot. Each job has a limited number of testers.</span>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">3</span>
                  <span><strong className="text-gray-900">Test and report</strong> — follow the builder's instructions, then write your feedback, log any bugs you find, and rate usability.</span>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">4</span>
                  <span><strong className="text-gray-900">Get paid on approval</strong> — once the builder approves your submission, you earn the full payout.</span>
                </li>
              </ul>
              <p className="mt-5 text-sm text-gray-500">
                No special skills required. If you can use an app and write clearly about your experience, you can earn.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ — two-column layout split by audience */}
      <section className="border-t border-gray-200 bg-gray-900">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-2xl font-bold text-white mb-10">Questions & Answers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-primary-400 mb-5">Pricing & Payments</p>
              <div className="space-y-6">
                <FaqItem
                  q="How much does it cost for builders?"
                  a="You set your own payout per tester, per job — anywhere from $1 to $1,000. That's the only cost. No platform fees during beta."
                />
                <FaqItem
                  q="How much can testers earn?"
                  a="Depends on the job. A quick 10-minute signup test might pay $5–$10, while a thorough 60-minute walkthrough could pay $30–$50. You see the payout before you claim."
                />
                <FaqItem
                  q="Is there an escrow system?"
                  a="Not yet — we're in beta. Payment approval is honor-system based for now. Escrow and automated payouts are on the roadmap."
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
                  a="Between 1 and 10. More testers = more perspectives but higher cost. Start with 2–3 for a good signal."
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live stats strip */}
      {stats && (stats.total_users > 0 || stats.open_jobs > 0) && (
        <section className="border-t border-gray-200 bg-primary-600">
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

      {/* Bottom CTA */}
      {!user && (
        <section className="border-t border-gray-200 bg-gray-900">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14 text-center">
            <h2 className="text-2xl font-bold text-white mb-3">Ready to get real feedback?</h2>
            <p className="text-gray-400 mb-6">Create a free account as a builder or tester. No credit card required.</p>
            <Link
              to="/register"
              className="inline-block px-6 py-3 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-400 shadow-sm shadow-primary-900"
            >
              Get Started
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
