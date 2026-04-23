'use client'

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import type { SystemStats, Container } from '@/types/docker'

interface StreamState {
  system: SystemStats | null
  containers: Container[] | null
  connected: boolean
  error: string | null
}

const defaultState: StreamState = {
  system: null,
  containers: null,
  connected: false,
  error: null,
}

const StreamContext = createContext<StreamState>(defaultState)

export function StreamProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<StreamState>(defaultState)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    function connect() {
      const es = new EventSource('/api/stream')
      esRef.current = es

      es.onopen = () =>
        setState((s) => ({ ...s, connected: true, error: null }))

      es.onerror = () =>
        setState((s) => ({ ...s, connected: false, error: 'Stream disconnected' }))

      es.addEventListener('system', (e) => {
        try {
          const system = JSON.parse(e.data) as SystemStats
          setState((s) => ({ ...s, system }))
        } catch {
          // ignore malformed frame
        }
      })

      es.addEventListener('containers', (e) => {
        try {
          const containers = JSON.parse(e.data) as Container[]
          setState((s) => ({ ...s, containers }))
        } catch {
          // ignore malformed frame
        }
      })
    }

    connect()
    return () => {
      esRef.current?.close()
    }
  }, [])

  return (
    <StreamContext.Provider value={state}>
      {children}
    </StreamContext.Provider>
  )
}

export function useStream(): StreamState {
  return useContext(StreamContext)
}
