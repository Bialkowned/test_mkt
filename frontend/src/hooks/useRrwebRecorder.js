import { useState, useRef, useCallback, useEffect } from 'react'
import { record } from 'rrweb'
import pako from 'pako'

export default function useRrwebRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [duration, setDuration] = useState(0)
  const [startedAt, setStartedAt] = useState(null)
  const eventsRef = useRef([])
  const stopFnRef = useRef(null)
  const timerRef = useRef(null)

  const startSession = useCallback(() => {
    eventsRef.current = []
    const now = new Date()
    setStartedAt(now)
    setDuration(0)
    setIsRecording(true)

    stopFnRef.current = record({
      emit(event) {
        eventsRef.current.push(event)
      },
    })

    timerRef.current = setInterval(() => {
      setDuration(Math.floor((Date.now() - now.getTime()) / 1000))
    }, 1000)
  }, [])

  const endSession = useCallback(() => {
    if (stopFnRef.current) {
      stopFnRef.current()
      stopFnRef.current = null
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    const endedAt = new Date()
    const sessionDuration = startedAt
      ? Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000)
      : duration

    setIsRecording(false)

    const json = JSON.stringify(eventsRef.current)
    const compressed = pako.gzip(json)
    const blob = new Blob([compressed], { type: 'application/gzip' })

    return {
      blob,
      duration: sessionDuration,
      startedAt: startedAt?.toISOString(),
      endedAt: endedAt.toISOString(),
    }
  }, [startedAt, duration])

  useEffect(() => {
    return () => {
      if (stopFnRef.current) stopFnRef.current()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  return { isRecording, duration, startSession, endSession }
}
