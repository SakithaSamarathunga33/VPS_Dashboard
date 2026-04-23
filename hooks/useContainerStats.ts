"use client"

import { useEffect, useState } from "react"
import useSWR from "swr"

import { fetchContainerStats } from "@/lib/agent"
import type { ContainerStats } from "@/types/docker"

const MAX_HISTORY = 50

export function useContainerStats(id: string | undefined) {
  const [history, setHistory] = useState<ContainerStats[]>([])

  const { data, error, isLoading, mutate, isValidating } = useSWR(
    id ? ["container-stats", id] : null,
    () => fetchContainerStats(id as string),
    { refreshInterval: 1000, revalidateOnFocus: true }
  )

  useEffect(() => {
    setHistory([])
  }, [id])

  useEffect(() => {
    if (!data) return
    setHistory((h) => {
      const last = h[h.length - 1]
      if (last?.timestamp === data.timestamp) return h
      return [...h, data].slice(-MAX_HISTORY)
    })
  }, [data])

  return {
    stats: data,
    history,
    error,
    isLoading,
    isValidating,
    refresh: mutate,
  }
}
