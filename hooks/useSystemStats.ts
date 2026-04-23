'use client'

import { useStream } from '@/context/stream-context'

export function useSystemStats() {
  const { system, connected, error } = useStream()

  return {
    stats: system,
    error: !connected && error ? new Error(error) : null,
    isLoading: system === null,
    isValidating: false,
    refresh: async () => {},
  }
}
