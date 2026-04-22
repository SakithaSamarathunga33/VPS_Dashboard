import type {
  Container,
  ContainerStats,
  SystemStats,
} from "@/types/docker"

const DEFAULT_ORIGIN = "http://127.0.0.1:4000"

function getBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_AGENT_URL?.trim() ?? DEFAULT_ORIGIN
  return raw.replace(/\/$/, "")
}

function getToken(): string {
  return process.env.NEXT_PUBLIC_AGENT_TOKEN?.trim() ?? ""
}

function authHeaders(): HeadersInit {
  const token = getToken()
  if (!token) {
    return {}
  }
  return { Authorization: `Bearer ${token}` }
}

export class AgentError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly path?: string
  ) {
    super(message)
    this.name = "AgentError"
  }
}

function buildUrl(path: string): string {
  const base = getBaseUrl()
  const p = path.startsWith("/") ? path : `/${path}`
  return `${base}${p}`
}

async function requestJson<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(buildUrl(path), {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...authHeaders(),
      ...init?.headers,
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new AgentError(
      text || `Request failed: ${res.status} ${res.statusText}`,
      res.status,
      path
    )
  }
  const text = await res.text()
  if (!text) {
    return undefined as T
  }
  return JSON.parse(text) as T
}

async function requestPostVoid(path: string): Promise<void> {
  const res = await fetch(buildUrl(path), {
    method: "POST",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...authHeaders(),
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new AgentError(
      text || `Request failed: ${res.status} ${res.statusText}`,
      res.status,
      path
    )
  }
}

export function getAgentConfig(): { baseUrl: string; hasToken: boolean } {
  return { baseUrl: getBaseUrl(), hasToken: Boolean(getToken()) }
}

export async function fetchSystemStats(): Promise<SystemStats> {
  return requestJson<SystemStats>("/system", { method: "GET" })
}

export async function fetchContainers(): Promise<Container[]> {
  return requestJson<Container[]>("/containers", { method: "GET" })
}

export async function fetchContainerStats(
  id: string
): Promise<ContainerStats> {
  const q = encodeURIComponent(id)
  return requestJson<ContainerStats>(`/containers/${q}/stats`, {
    method: "GET",
  })
}

export async function fetchContainerLogs(
  id: string,
  tail: number
): Promise<string[]> {
  const q = encodeURIComponent(id)
  const t = Math.max(1, Math.min(5000, tail))
  return requestJson<string[]>(`/containers/${q}/logs?tail=${t}`, {
    method: "GET",
  })
}

export async function startContainer(id: string): Promise<void> {
  const q = encodeURIComponent(id)
  await requestPostVoid(`/containers/${q}/start`)
}

export async function stopContainer(id: string): Promise<void> {
  const q = encodeURIComponent(id)
  await requestPostVoid(`/containers/${q}/stop`)
}

export async function restartContainer(id: string): Promise<void> {
  const q = encodeURIComponent(id)
  await requestPostVoid(`/containers/${q}/restart`)
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
  limit: number = 90
): Promise<{ history: UptimeHistoryEntry[] }> {
  const q = encodeURIComponent(id)
  const l = Math.min(500, Math.max(1, limit))
  return requestJson<{ history: UptimeHistoryEntry[] }>(
    `/containers/${q}/uptime/history?limit=${l}`,
    { method: "GET" }
  )
}

export async function fetchUptimeStats(
  id: string,
  days: number = 30
): Promise<{
  uptimePercent: number
  dailyBlocks: UptimeDailyBlock[]
  incidents: UptimeIncident[]
}> {
  const q = encodeURIComponent(id)
  const d = Math.min(365, Math.max(1, days))
  return requestJson<{
    uptimePercent: number
    dailyBlocks: UptimeDailyBlock[]
    incidents: UptimeIncident[]
  }>(`/containers/${q}/uptime?days=${d}`, { method: "GET" })
}
