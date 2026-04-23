import type { ContainerStats } from '@/types/docker'

export class AgentError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly path?: string
  ) {
    super(message)
    this.name = 'AgentError'
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `/api${path.startsWith('/') ? path : `/${path}`}`
  const res = await fetch(url, {
    ...init,
    cache: 'no-store',
    headers: { Accept: 'application/json', ...init?.headers },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new AgentError(text || `Request failed: ${res.status} ${res.statusText}`, res.status, path)
  }
  const text = await res.text()
  if (!text) return undefined as T
  return JSON.parse(text) as T
}

async function requestPostVoid(path: string): Promise<void> {
  const url = `/api${path.startsWith('/') ? path : `/${path}`}`
  const res = await fetch(url, {
    method: 'POST',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new AgentError(text || `Request failed: ${res.status} ${res.statusText}`, res.status, path)
  }
}

export async function fetchContainerStats(id: string): Promise<ContainerStats> {
  return requestJson<ContainerStats>(`/containers/${encodeURIComponent(id)}/stats`)
}

export async function fetchContainerLogs(id: string, tail: number): Promise<string[]> {
  const t = Math.max(1, Math.min(5000, tail))
  return requestJson<string[]>(`/containers/${encodeURIComponent(id)}/logs?tail=${t}`)
}

export async function startContainer(id: string): Promise<void> {
  await requestPostVoid(`/containers/${encodeURIComponent(id)}/start`)
}

export async function stopContainer(id: string): Promise<void> {
  await requestPostVoid(`/containers/${encodeURIComponent(id)}/stop`)
}

export async function restartContainer(id: string): Promise<void> {
  await requestPostVoid(`/containers/${encodeURIComponent(id)}/restart`)
}

export type UptimeHistoryEntry = {
  is_up: boolean
  status: string
  checked_at: string
}

export type UptimeDailyBlock = {
  date: string
  up_count: number
  down_count: number
  total_count: number
  uptime_percent: number
}

export type UptimeIncident = {
  start: string
  end: string | null
}

export async function fetchUptimeHistory(
  id: string,
  limit = 90
): Promise<{ history: UptimeHistoryEntry[] }> {
  const l = Math.min(500, Math.max(1, limit))
  return requestJson<{ history: UptimeHistoryEntry[] }>(
    `/containers/${encodeURIComponent(id)}/uptime/history?limit=${l}`
  )
}

export async function fetchUptimeStats(
  id: string,
  days = 30
): Promise<{ uptimePercent: number; dailyBlocks: UptimeDailyBlock[]; incidents: UptimeIncident[] }> {
  const d = Math.min(365, Math.max(1, days))
  return requestJson<{ uptimePercent: number; dailyBlocks: UptimeDailyBlock[]; incidents: UptimeIncident[] }>(
    `/containers/${encodeURIComponent(id)}/uptime?days=${d}`
  )
}
