'use client'

import { useRef } from 'react'
import { useContainersStream } from '@/context/stream-context'
import type { Container } from '@/types/docker'

// Stable empty-array sentinel so callers get a consistent reference when
// containers haven't loaded yet (avoids spurious downstream re-renders).
const EMPTY: Container[] = []

export function useContainers() {
  const { containers } = useContainersStream()

  // Keep a stable reference to the last non-null array so consumers that
  // only care about container data don't see reference churn from null→[].
  const stableRef = useRef<Container[]>(EMPTY)
  if (containers !== null) stableRef.current = containers

  return {
    containers: stableRef.current,
    error: null,
    isLoading: containers === null,
    isValidating: false,
    refresh: async () => {},
  }
}
