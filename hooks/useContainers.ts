'use client'

import { useStream } from '@/context/stream-context'

export function useContainers() {
  const { containers, connected, error } = useStream()

  return {
    containers: containers ?? [],
    error: !connected && error ? new Error(error) : null,
    isLoading: containers === null,
    isValidating: false,
    refresh: async () => {},
  }
}
