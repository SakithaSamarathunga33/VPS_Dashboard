'use client'

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import type { SystemStats, Container } from '@/types/docker'

// ---------------------------------------------------------------------------
// Two separate contexts so a containers update never re-renders
// system-only consumers (TopBar, CPU page, etc.)
// ---------------------------------------------------------------------------

interface SystemStreamState {
  system: SystemStats | null
  connected: boolean
  error: string | null
}

interface ContainersStreamState {
  containers: Container[] | null
}

const defaultSystem: SystemStreamState = { system: null, connected: false, error: null }
const defaultContainers: ContainersStreamState = { containers: null }

const SystemContext = createContext<SystemStreamState>(defaultSystem)
const ContainersContext = createContext<ContainersStreamState>(defaultContainers)

export function StreamProvider({ children }: { children: React.ReactNode }) {
  const [sysState, setSysState] = useState<SystemStreamState>(defaultSystem)
  const [conState, setConState] = useState<ContainersStreamState>(defaultContainers)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    function connect() {
      const es = new EventSource('/api/stream')
      esRef.current = es

      es.onopen = () =>
        setSysState((s) => ({ ...s, connected: true, error: null }))

      es.onerror = () =>
        setSysState((s) => ({ ...s, connected: false, error: 'Stream disconnected' }))

      es.addEventListener('system', (e) => {
        try {
          const system = JSON.parse(e.data) as SystemStats
          setSysState((s) => ({ ...s, system }))
        } catch {
          // ignore malformed frame
        }
      })

      es.addEventListener('containers', (e) => {
        try {
          const containers = JSON.parse(e.data) as Container[]
          setConState({ containers })
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
    <SystemContext.Provider value={sysState}>
      <ContainersContext.Provider value={conState}>
        {children}
      </ContainersContext.Provider>
    </SystemContext.Provider>
  )
}

export function useSystemStream(): SystemStreamState {
  return useContext(SystemContext)
}

export function useContainersStream(): ContainersStreamState {
  return useContext(ContainersContext)
}
