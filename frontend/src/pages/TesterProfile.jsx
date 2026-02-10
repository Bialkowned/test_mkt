import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'

export default function TesterProfile() {
  const { username } = useParams()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    axios.get(`/api/testers/${username}`)
      .then((r) => setProfile(r.data))
      .catch((err) => setError(err.response?.data?.detail || 'Tester not found'))
      .finally(() => setLoading(false))
  }, [username])

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse space-y-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-gray-200" />
            <div className="space-y-2">
              <div className="h-6 bg-gray-200 rounded w-48" />
              <div className="h-4 bg-gray-200 rounded w-32" />
            </div>
          </div>
          <div className="h-24 bg-gray-200 rounded-lg" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>
        <Link to="/" className="text-primary-600 hover:text-primary-700 font-medium mt-4 inline-block">Back to Home</Link>
      </div>
    )
  }

  const memberSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Profile Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-start gap-5">
          <img
            src={`https://github.com/${profile.github_username}.png`}
            alt={profile.github_username}
            className="w-20 h-20 rounded-full bg-gray-100"
          />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">
              {profile.first_name} {profile.last_name}
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">@{profile.github_username}</p>

            <div className="flex items-center gap-5 mt-3 text-sm text-gray-600">
              {profile.avg_rating > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <svg key={n} width="16" height="16" viewBox="0 0 24 24" fill={n <= Math.round(profile.avg_rating) ? '#f59e0b' : 'none'} stroke="#f59e0b" strokeWidth="2">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    ))}
                  </div>
                  <span className="font-medium">{profile.avg_rating}</span>
                  <span className="text-gray-400">({profile.total_ratings})</span>
                </div>
              )}
              <span>{profile.completed_tests} test{profile.completed_tests !== 1 ? 's' : ''} completed</span>
              {memberSince && <span>Member since {memberSince}</span>}
            </div>
          </div>
        </div>

        {profile.bio && (
          <p className="mt-4 text-gray-700 text-sm leading-relaxed">{profile.bio}</p>
        )}

        {profile.specialties?.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {profile.specialties.map((s) => (
              <span key={s} className="px-2.5 py-1 bg-primary-50 text-primary-700 text-xs font-medium rounded-full">
                {s}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Reviews */}
      {profile.reviews?.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Reviews ({profile.reviews.length})</h2>
          <div className="space-y-3">
            {profile.reviews.map((review, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-lg p-5">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-medium text-gray-900 text-sm">{review.job_title}</span>
                    <span className="text-gray-400 text-xs ml-2">by {review.builder_name}</span>
                  </div>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <svg key={n} width="14" height="14" viewBox="0 0 24 24" fill={n <= review.rating ? '#f59e0b' : 'none'} stroke="#f59e0b" strokeWidth="2">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    ))}
                  </div>
                </div>
                {review.feedback && (
                  <p className="text-sm text-gray-600">{review.feedback}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {profile.reviews?.length === 0 && profile.completed_tests === 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500">No reviews yet. This tester hasn't completed any rated tests.</p>
        </div>
      )}
    </div>
  )
}
