'use client'

import { useEffect, useRef } from 'react'
import { fetchPositions } from './fetch-positions'
import { useMyStore } from './store'

const POLL_INTERVAL_MS = 5000

export function usePositionsPolling() {
  const setPositions = useMyStore((s) => s.setPositions)
  const setPositionsRef = useRef(setPositions)
  setPositionsRef.current = setPositions

  useEffect(() => {
    let timerId: ReturnType<typeof setInterval> | null = null

    async function poll() {
      if (document.visibilityState === 'hidden') return
      try {
        const data = await fetchPositions()
        setPositionsRef.current(data.positions)
      } catch {
        // keep last good data; do not throw
      }
    }

    function startTimer() {
      if (timerId === null) {
        timerId = setInterval(poll, POLL_INTERVAL_MS)
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') {
        poll()
        startTimer()
      }
    }

    poll()
    startTimer()
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      if (timerId !== null) clearInterval(timerId)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])
}
