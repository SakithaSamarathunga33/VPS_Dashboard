"use client"

import useSWR from "swr"

import type { SystemStats } from "@/types/docker"

async function fetchSystemStats(): Promise<SystemStats> {
  const res = await fetch("/api/system", { cache: "no-store" })
  if (!res.ok) throw new Error(`Failed to fetch system stats: ${res.status}`)
  return res.json() as Promise<SystemStats>
}

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
