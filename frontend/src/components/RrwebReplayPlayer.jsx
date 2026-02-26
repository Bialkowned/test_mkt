import { useState, useEffect, useRef } from 'react'
import pako from 'pako'

export default function RrwebReplayPlayer({ rrwebUrl, sessionDuration }) {
  const containerRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const playerRef = useRef(null)

  useEffect(() => {
    if (!rrwebUrl) return
    let cancelled = false

    const loadPlayer = async () => {
      try {
        const resp = await fetch(rrwebUrl)
        if (!resp.ok) throw new Error('Failed to fetch recording')
        const buffer = await resp.arrayBuffer()
        const decompressed = pako.ungzip(new Uint8Array(buffer), { to: 'string' })
        const events = JSON.parse(decompressed)

        if (cancelled || !containerRef.current) return

        const { default: rrwebPlayer } = await import('rrweb-player')
        await import('rrweb-player/dist/style.css')

        containerRef.current.innerHTML = ''

        playerRef.current = new rrwebPlayer({
          target: containerRef.current,
          props: {
            events,
            width: containerRef.current.offsetWidth || 640,
            height: 400,
            autoPlay: false,
            showController: true,
            speedOption: [0.5, 1, 2, 4],
          },
        })

        setLoading(false)
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load session replay')
          setLoading(false)
        }
      }
    }

    loadPlayer()
    return () => { cancelled = true }
  }, [rrwebUrl])

  const formatDuration = (s) => {
    if (!s) return ''
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}m ${sec}s`
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
        {error}
      </div>
    )
  }

  return (
    <div>
      {sessionDuration > 0 && (
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-medium text-gray-500">Session duration:</span>
          <span className="text-xs font-semibold text-gray-900">{formatDuration(sessionDuration)}</span>
        </div>
      )}
      {loading && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <div className="w-8 h-8 border-3 border-gray-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading session replay...</p>
        </div>
      )}
      <div ref={containerRef} className="rounded-lg overflow-hidden" />
    </div>
  )
}
