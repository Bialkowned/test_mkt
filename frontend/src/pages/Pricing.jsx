import { useState } from 'react'
import { Link } from 'react-router-dom'

const PLATFORM_FEE_RATE = 0.15

const SERVICE_TYPES = [
  {
    id: 'test',
    name: 'Test',
    desc: 'Walk through the user journey, report bugs, provide text feedback and a usability score.',
    range: '$10 — $50 / item',
    color: 'border-blue-200 bg-blue-50',
    iconColor: 'bg-blue-600',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
    ),
    deliverables: ['Written feedback', 'Bug reports with severity', 'Usability score (1-5)', 'Improvement suggestions'],
  },
  {
    id: 'record',
    name: 'Record',
    desc: 'Screen record the entire walkthrough with tagged moments for bugs and UX issues.',
    range: '$20 — $75 / item',
    color: 'border-red-200 bg-red-50',
    iconColor: 'bg-red-600',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>
    ),
    deliverables: ['Full screen recording', 'Timestamped video tags', 'Written feedback', 'Bug and UX issue markers'],
  },
  {
    id: 'document',
    name: 'Document',
    desc: 'Write structured, step-by-step documentation of the user journey with screenshots and notes.',
    range: '$25 — $100 / item',
    color: 'border-emerald-200 bg-emerald-50',
    iconColor: 'bg-emerald-600',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
    ),
    deliverables: ['Step-by-step documentation', 'Flow descriptions', 'Edge case notes', 'Structured text output'],
  },
  {
    id: 'voiceover',
    name: 'Voiceover',
    desc: 'Narrated screen recording — the tester talks through their experience in real time as they use your app.',
    range: '$30 — $125 / item',
    color: 'border-purple-200 bg-purple-50',
    iconColor: 'bg-purple-600',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
    ),
    deliverables: ['Narrated screen recording', 'Live commentary and reactions', 'Written transcript', 'Video feedback'],
  },
]

export default function Pricing({ user }) {
  // Configurator state
  const [roles, setRoles] = useState([
    { id: 1, name: 'Default User', items: [{ id: 1, title: '', description: '', service: 'test', price: 25, hours: 0.5, pages: [] }] },
  ])

  const addRole = () => {
    const id = Date.now()
    setRoles([...roles, { id, name: '', items: [{ id: id + 1, title: '', description: '', service: 'test', price: 25, hours: 0.5, pages: [] }] }])
  }

  const removeRole = (roleId) => {
    if (roles.length <= 1) return
    setRoles(roles.filter((r) => r.id !== roleId))
  }

  const updateRoleName = (roleId, name) => {
    setRoles(roles.map((r) => r.id === roleId ? { ...r, name } : r))
  }

  const addItem = (roleId) => {
    setRoles(roles.map((r) => r.id === roleId ? {
      ...r, items: [...r.items, { id: Date.now(), title: '', description: '', service: 'test', price: 25, hours: 0.5, pages: [] }]
    } : r))
  }

  const removeItem = (roleId, itemId) => {
    setRoles(roles.map((r) => {
      if (r.id !== roleId || r.items.length <= 1) return r
      return { ...r, items: r.items.filter((i) => i.id !== itemId) }
    }))
  }

  const updateItem = (roleId, itemId, field, value) => {
    setRoles(roles.map((r) => r.id === roleId ? {
      ...r, items: r.items.map((i) => i.id === itemId ? { ...i, [field]: value } : i)
    } : r))
  }

  const addPage = (roleId, itemId) => {
    setRoles(roles.map((r) => r.id === roleId ? {
      ...r, items: r.items.map((i) => i.id === itemId ? {
        ...i, pages: [...i.pages, { id: Date.now(), name: '' }]
      } : i)
    } : r))
  }

  const removePage = (roleId, itemId, pageId) => {
    setRoles(roles.map((r) => r.id === roleId ? {
      ...r, items: r.items.map((i) => i.id === itemId ? {
        ...i, pages: i.pages.filter((p) => p.id !== pageId)
      } : i)
    } : r))
  }

  const updatePageName = (roleId, itemId, pageId, name) => {
    setRoles(roles.map((r) => r.id === roleId ? {
      ...r, items: r.items.map((i) => i.id === itemId ? {
        ...i, pages: i.pages.map((p) => p.id === pageId ? { ...p, name } : p)
      } : i)
    } : r))
  }

  const totalPages = roles.reduce((s, r) => s + r.items.reduce((si, i) => si + (i.pages?.length || 0), 0), 0)
  const totalItems = roles.reduce((s, r) => s + r.items.length, 0)
  const totalHours = roles.reduce((s, r) => s + r.items.reduce((si, i) => si + (parseFloat(i.hours) || 0), 0), 0)
  const proposedTotal = roles.reduce((s, r) => s + r.items.reduce((si, i) => si + (parseFloat(i.price) || 0), 0), 0)
  const platformFee = Math.round(proposedTotal * PLATFORM_FEE_RATE * 100) / 100
  const grandTotal = Math.round((proposedTotal + platformFee) * 100) / 100

  return (
    <div>
      {/* Section 1: Service Types Showcase */}
      <section className="bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-gray-900">Four ways to test your app</h1>
            <p className="text-gray-500 mt-2 max-w-xl mx-auto">
              Choose the right service type for each part of your test plan. Mix and match across user roles and journeys.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {SERVICE_TYPES.map((st) => (
              <div key={st.id} className={`border rounded-xl p-6 ${st.color}`}>
                <div className="flex items-start gap-4">
                  <div className={`w-11 h-11 rounded-lg ${st.iconColor} flex items-center justify-center shrink-0`}>
                    {st.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-lg font-bold text-gray-900">{st.name}</h3>
                      <span className="text-sm font-medium text-gray-500">{st.range}</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{st.desc}</p>
                    <div className="space-y-1">
                      {st.deliverables.map((d, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                          <svg className="w-3.5 h-3.5 text-green-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                          {d}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 2: Interactive Test Plan Configurator */}
      <section className="bg-gray-50 border-y border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-gray-900">Build your test plan</h2>
            <p className="text-gray-500 mt-2">Add roles and items to see what a structured test plan looks like. This is a preview — create an account to publish.</p>
          </div>

          <div className="flex gap-6">
            <div className="flex-1 space-y-4">
              {roles.map((role) => (
                <div key={role.id} className="bg-white border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center justify-between mb-3">
                    <input
                      type="text"
                      placeholder="Role name (e.g. Admin)"
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 w-64"
                      value={role.name}
                      onChange={(e) => updateRoleName(role.id, e.target.value)}
                    />
                    {roles.length > 1 && (
                      <button onClick={() => removeRole(role.id)} className="text-xs text-gray-400 hover:text-red-500">Remove role</button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {role.items.map((item) => (
                      <div key={item.id} className="bg-gray-50 border border-gray-100 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <input
                            type="text"
                            placeholder="Item title (e.g. Checkout Flow)"
                            className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            value={item.title || ''}
                            onChange={(e) => updateItem(role.id, item.id, 'title', e.target.value)}
                          />
                          {role.items.length > 1 && (
                            <button onClick={() => removeItem(role.id, item.id)} className="ml-2 text-gray-400 hover:text-red-500 text-xs mt-1">remove</button>
                          )}
                        </div>

                        <textarea
                          rows={2}
                          placeholder="Expectations — what should the tester do, look for, or deliver?"
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none mb-3"
                          value={item.description || ''}
                          onChange={(e) => updateItem(role.id, item.id, 'description', e.target.value)}
                        />

                        <div className="flex items-center gap-3 mb-3">
                          <select
                            className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-primary-500"
                            value={item.service}
                            onChange={(e) => updateItem(role.id, item.id, 'service', e.target.value)}
                          >
                            {SERVICE_TYPES.map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}
                          </select>
                          <div className="flex items-center gap-2 ml-auto">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min={0.5}
                                step={0.5}
                                className="w-16 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-right focus:ring-2 focus:ring-primary-500"
                                value={item.hours}
                                onChange={(e) => updateItem(role.id, item.id, 'hours', parseFloat(e.target.value) || 0.5)}
                              />
                              <span className="text-xs text-gray-400">hrs</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-400">$</span>
                              <input
                                type="number"
                                min={1}
                                className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-right focus:ring-2 focus:ring-primary-500"
                                value={item.price}
                                onChange={(e) => updateItem(role.id, item.id, 'price', parseFloat(e.target.value) || 0)}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Pages in this flow */}
                        <div className="border-t border-gray-200 pt-3">
                          <p className="text-xs font-medium text-gray-500 mb-2">Pages in this flow</p>
                          {item.pages?.length > 0 && (
                            <div className="space-y-1.5 mb-2">
                              {item.pages.map((page) => (
                                <div key={page.id} className="flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-primary-400 shrink-0" />
                                  <input
                                    type="text"
                                    placeholder="Page name (e.g. Cart Page)"
                                    className="flex-1 px-2.5 py-1 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                                    value={page.name}
                                    onChange={(e) => updatePageName(role.id, item.id, page.id, e.target.value)}
                                  />
                                  <button onClick={() => removePage(role.id, item.id, page.id)} className="text-gray-300 hover:text-red-400 text-xs px-1">x</button>
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

                  <button onClick={() => addItem(role.id)} className="mt-3 text-sm text-primary-600 hover:text-primary-700 font-medium">
                    + Add item
                  </button>
                </div>
              ))}

              <button
                onClick={addRole}
                className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 font-medium"
              >
                + Add Role
              </button>
            </div>

            {/* Cost sidebar */}
            <div className="w-64 shrink-0">
              <div className="bg-white border border-gray-200 rounded-lg p-5 sticky top-24">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Cost Preview</h3>
                <div className="space-y-2 text-sm">
                  {roles.map((r) => {
                    const roleTotal = r.items.reduce((s, i) => s + (parseFloat(i.price) || 0), 0)
                    const roleHours = r.items.reduce((s, i) => s + (parseFloat(i.hours) || 0), 0)
                    const rolePages = r.items.reduce((s, i) => s + (i.pages?.length || 0), 0)
                    return (
                      <div key={r.id}>
                        <div className="flex justify-between text-gray-600">
                          <span className="truncate">{r.name || 'Unnamed'} ({r.items.length} item{r.items.length !== 1 ? 's' : ''}{rolePages > 0 ? `, ${rolePages} pg` : ''})</span>
                          <span>${roleTotal.toFixed(2)}</span>
                        </div>
                        <div className="text-xs text-gray-400 text-right">{roleHours} hr{roleHours !== 1 ? 's' : ''}</div>
                      </div>
                    )
                  })}
                  {totalPages > 0 && (
                    <div className="flex justify-between text-gray-400 text-xs">
                      <span>Total pages</span>
                      <span>{totalPages}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-600 pt-2 border-t border-gray-100">
                    <span>Subtotal ({totalItems} items)</span>
                    <span>${proposedTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500 text-xs">
                    <span>Est. total time</span>
                    <span>{totalHours} hr{totalHours !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Platform fee (15%)</span>
                    <span>${platformFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-gray-900 pt-2 border-t border-gray-200">
                    <span>Max total</span>
                    <span>${grandTotal.toFixed(2)}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-3">Testers can accept or counter-bid your prices. You only pay when accepting a bid.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: How Bidding Works */}
      <section className="bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-gray-900">How bidding works</h2>
            <p className="text-gray-500 mt-2">No upfront payment. You set proposed prices, testers compete for your work.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {[
              {
                step: '1',
                title: 'You set proposed prices',
                desc: 'Create a test plan with roles, items, and service types. Set a proposed price per item — this is your starting offer.',
              },
              {
                step: '2',
                title: 'Testers review and bid',
                desc: 'Testers see your plan and either accept your price or counter-offer. You see their experience, ratings, and message.',
              },
              {
                step: '3',
                title: 'Accept a bid, pay, work begins',
                desc: 'Pick the best bid. Payment is processed when you accept. The tester starts working and submits deliverables per item.',
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center text-lg font-bold mx-auto mb-3">
                  {item.step}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* FAQ */}
          <div className="bg-gray-50 rounded-xl p-6 space-y-5">
            <h3 className="font-semibold text-gray-900">Common questions</h3>
            {[
              { q: 'What if all bids are too high?', a: "You're never forced to accept. Reject bids and adjust your proposed prices, or wait for more competitive offers." },
              { q: 'Can I adjust prices after publishing?', a: 'You set prices at creation time. If you need different pricing, create a new job with updated amounts.' },
              { q: 'When do I actually pay?', a: "Only when you accept a bid. Publishing a job is free. Payment is the bid amount + 15% platform fee, processed through Stripe." },
              { q: 'How is legacy (v1) pricing different?', a: 'V1 jobs use flat pricing: you set a payout per tester and pay upfront. V2 structured jobs use the bidding system described above.' },
            ].map((faq, i) => (
              <div key={i}>
                <p className="text-sm font-medium text-gray-900">{faq.q}</p>
                <p className="text-sm text-gray-500 mt-0.5">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4: CTA */}
      <section className="bg-gray-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">Ready to build your test plan?</h2>
          <p className="text-gray-400 mb-6">Create structured test jobs with roles, items, and service types. Testers bid for your work.</p>
          {user ? (
            <Link
              to="/jobs/create"
              className="inline-block px-8 py-3 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-400 transition-colors"
            >
              Create Your First Job
            </Link>
          ) : (
            <Link
              to="/register"
              className="inline-block px-8 py-3 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-400 transition-colors"
            >
              Get Started Free
            </Link>
          )}
        </div>
      </section>
    </div>
  )
}
