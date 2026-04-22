"use client"

import { useEffect } from "react"
import useSWR from "swr"

import { fetchContainerLogs } from "@/lib/agent"

export type UseContainerLogsOptions = {
  tail?: number
  refreshInterval?: number
}

export function useContainerLogs(
  id: string | undefined,
  options: UseContainerLogsOptions = {}
) {
  const { tail = 100, refreshInterval = 10000 } = options

  const { data, error, isLoading, mutate, isValidating } = useSWR(
    id ? ["container-logs", id, tail] : null,
    () => fetchContainerLogs(id as string, tail),
    { refreshInterval, revalidateOnFocus: true }
  )

  return {
    lines: data,
    error,
    isLoading,
    isValidating,
    refresh: mutate,
  }
}

export function useAutoScrollLogs(
  enabled: boolean,
  lines: string[] | undefined,
  scrollToBottom: () => void
) {
  useEffect(() => {
    if (!enabled || !lines?.length) return
    const id = requestAnimationFrame(() => {
      scrollToBottom()
    })
    return () => cancelAnimationFrame(id)
  }, [enabled, lines, scrollToBottom])
}
