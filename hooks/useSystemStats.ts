"use client"

import useSWR from "swr"

import { fetchSystemStats } from "@/lib/agent"

export function useSystemStats() {
  const { data, error, isLoading, mutate, isValidating } = useSWR(
    "system-stats",
    fetchSystemStats,
    { refreshInterval: 5000, revalidateOnFocus: true }
  )
  return {
    stats: data,
    error,
    isLoading,
    isValidating,
    refresh: mutate,
  }
}
