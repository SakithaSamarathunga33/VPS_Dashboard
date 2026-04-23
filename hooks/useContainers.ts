"use client"

import useSWR from "swr"

import type { Container } from "@/types/docker"

async function fetchContainers(): Promise<Container[]> {
  const res = await fetch("/api/containers", { cache: "no-store" })
  if (!res.ok) throw new Error(`Failed to fetch containers: ${res.status}`)
  return res.json() as Promise<Container[]>
}

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
