"use client"

import useSWR from "swr"

import { fetchUptimeHistory, fetchUptimeStats } from "@/lib/agent"

export function useUptimeHistory(containerId: string | undefined, limit = 90) {
  const { data, error, isLoading, mutate, isValidating } = useSWR(
    containerId ? ["uptime-history", containerId, limit] : null,
    () => fetchUptimeHistory(containerId as string, limit),
    { refreshInterval: 30_000, revalidateOnFocus: true }
  )
  return {
    history: data?.history ?? [],
    error,
    isLoading,
    isValidating,
    refresh: mutate,
  }
}

export function useUptimeStats(
  containerId: string | undefined,
  days = 30
) {
  const { data, error, isLoading, mutate, isValidating } = useSWR(
    containerId ? ["uptime-stats", containerId, days] : null,
    () => fetchUptimeStats(containerId as string, days),
    { refreshInterval: 30_000, revalidateOnFocus: true }
  )
  return {
    uptimePercent: data?.uptimePercent ?? 100,
    dailyBlocks: data?.dailyBlocks ?? [],
    incidents: data?.incidents ?? [],
    error,
    isLoading,
    isValidating,
    refresh: mutate,
  }
}
