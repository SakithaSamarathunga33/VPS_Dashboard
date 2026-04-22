"use client"

import useSWR from "swr"

import { fetchContainers } from "@/lib/agent"

export function useContainers() {
  const { data, error, isLoading, mutate, isValidating } = useSWR(
    "containers",
    fetchContainers,
    { refreshInterval: 5000, revalidateOnFocus: true }
  )
  return {
    containers: data,
    error,
    isLoading,
    isValidating,
    refresh: mutate,
  }
}
