import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'

function StarRating({ rating, size = 14 }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} width={size} height={size} viewBox="0 0 24 24" fill={n <= Math.round(rating) ? '#f59e0b' : 'none'} stroke="#f59e0b" strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  )
}

export default function TesterProfile() {
  const { slug } = useParams()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    axios.get(`/api/testers/${slug}`)
      .then((r) => setProfile(r.data))
      .catch((err) => setError(err.response?.data?.detail || 'Tester not found'))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) {
    return (
      <div className="px-6 lg:px-10 py-10 max-w-[1100px] mx-auto">
        <div className="animate-pulse">
          <div className="h-32 bg-gray-100 rounded-xl mb-6" />
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="h-20 bg-gray-100 rounded-xl" />
            <div className="h-20 bg-gray-100 rounded-xl" />
            <div className="h-20 bg-gray-100 rounded-xl" />
          </div>
          <div className="h-48 bg-gray-100 rounded-xl" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="px-6 lg:px-10 py-10 max-w-[1100px] mx-auto">
        <div className="py-20 text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 mx-auto mb-4 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-900 mb-1">Profile not found</p>
          <p className="text-sm text-gray-400 mb-6">{error}</p>
          <Link to="/" className="text-sm font-medium text-gray-900 hover:text-gray-600 transition-colors">&larr; Back to home</Link>
        </div>
      </div>
    )
  }

  const memberSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null

  const initials = `${(profile.first_name || '')[0] || ''}${(profile.last_name || '')[0] || ''}`.toUpperCase()
  const hasReviews = profile.reviews?.length > 0
  const hasStats = profile.completed_tests > 0 || profile.avg_rating > 0

  return (
    <div className="px-6 lg:px-10 py-10 max-w-[1100px] mx-auto">

      {/* Hero card */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
        {/* Banner */}
        <div className="h-24 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative">
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)',
            backgroundSize: '20px 20px',
          }} />
        </div>

        <div className="px-6 pb-6">
          {/* Avatar + name row */}
          <div className="flex items-end gap-5 -mt-10 mb-4">
            <div className="w-20 h-20 rounded-xl bg-white border-4 border-white shadow-sm flex items-center justify-center shrink-0">
              <div className="w-full h-full rounded-lg bg-gray-900 flex items-center justify-center">
                <span className="text-xl font-bold text-white">{initials}</span>
              </div>
            </div>
            <div className="pb-1 flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900">
                {profile.first_name} {profile.last_name}
              </h1>
              <div className="flex items-center gap-3 mt-0.5">
                {memberSince && <p className="text-xs text-gray-400">Member since {memberSince}</p>}
                {profile.avg_rating > 0 && (
                  <div className="flex items-center gap-1">
                    <StarRating rating={profile.avg_rating} size={12} />
                    <span className="text-xs font-semibold text-gray-900">{profile.avg_rating.toFixed(1)}</span>
                    <span className="text-xs text-gray-400">({profile.total_ratings})</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="text-sm text-gray-600 leading-relaxed max-w-2xl">{profile.bio}</p>
          )}

          {/* Specialties */}
          {profile.specialties?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {profile.specialties.map((s) => (
                <span key={s} className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-md">
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats + Reviews grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left column — stats */}
        <div className="lg:col-span-1 space-y-4">
          {/* Stats cards */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Stats</h2>
            </div>
            <div className="divide-y divide-gray-100">
              <div className="px-5 py-3.5 flex items-center justify-between">
                <span className="text-sm text-gray-500">Tests completed</span>
                <span className="text-sm font-bold text-gray-900 tabular-nums">{profile.completed_tests}</span>
              </div>
              <div className="px-5 py-3.5 flex items-center justify-between">
                <span className="text-sm text-gray-500">Avg. rating</span>
                <span className="text-sm font-bold text-gray-900 tabular-nums">
                  {profile.avg_rating > 0 ? profile.avg_rating.toFixed(1) : '—'}
                </span>
              </div>
              <div className="px-5 py-3.5 flex items-center justify-between">
                <span className="text-sm text-gray-500">Total reviews</span>
                <span className="text-sm font-bold text-gray-900 tabular-nums">{profile.total_ratings || 0}</span>
              </div>
            </div>
          </div>

          {/* Rating breakdown */}
          {profile.avg_rating > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Rating</h2>
              </div>
              <div className="px-5 py-5 text-center">
                <p className="text-4xl font-bold text-gray-900 tabular-nums">{profile.avg_rating.toFixed(1)}</p>
                <div className="flex justify-center mt-2">
                  <StarRating rating={profile.avg_rating} size={18} />
                </div>
                <p className="text-xs text-gray-400 mt-2">Based on {profile.total_ratings} review{profile.total_ratings !== 1 ? 's' : ''}</p>
              </div>
            </div>
          )}

          {/* Member info */}
          <div className="bg-gray-50 rounded-xl px-5 py-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">About</h3>
            <div className="space-y-2 text-xs text-gray-500">
              {memberSince && (
                <div className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                  Joined {memberSince}
                </div>
              )}
              <div className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.745 3.745 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                </svg>
                Verified tester
              </div>
            </div>
          </div>
        </div>

        {/* Right column — reviews */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Reviews</h2>
              {hasReviews && (
                <span className="text-xs text-gray-300 tabular-nums">{profile.reviews.length}</span>
              )}
            </div>

            {hasReviews ? (
              <div className="divide-y divide-gray-100">
                {profile.reviews.map((review, i) => (
                  <div key={i} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{review.job_title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">by {review.builder_name}</p>
                      </div>
                      <div className="shrink-0">
                        <StarRating rating={review.rating} size={13} />
                      </div>
                    </div>
                    {review.feedback && (
                      <p className="text-sm text-gray-600 leading-relaxed">{review.feedback}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-5 py-16 text-center">
                <div className="w-10 h-10 rounded-full bg-gray-100 mx-auto mb-3 flex items-center justify-center">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-900">No reviews yet</p>
                <p className="text-xs text-gray-400 mt-1">Reviews will appear here once builders rate completed work.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
