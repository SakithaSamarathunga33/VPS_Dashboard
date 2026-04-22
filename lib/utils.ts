import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import type { Container } from "@/types/docker"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0 || !Number.isFinite(bytes)) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB"] as const
  const i = Math.min(
    Math.floor(Math.log(Math.abs(bytes)) / Math.log(k)),
    sizes.length - 1
  )
  const n = bytes / k ** i
  return `${n.toFixed(i === 0 ? 0 : decimals)} ${sizes[i]}`
}

export function formatUptime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0m"
  const s = Math.floor(seconds)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const parts: string[] = []
  if (d > 0) parts.push(`${d}d`)
  if (h > 0) parts.push(`${h}h`)
  if (m > 0) parts.push(`${m}m`)
  if (parts.length === 0) parts.push(`${s % 60}s`)
  return parts.join(" ")
}

export function formatPercent(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return "—"
  return `${value.toFixed(decimals)}%`
}

export function getStatusColor(status: Container["status"]): string {
  const map: Record<Container["status"], string> = {
    running: "text-vps-green",
    exited: "text-vps-red",
    paused: "text-vps-yellow",
    restarting: "text-vps-blue",
    dead: "text-muted-foreground",
  }
  return map[status]
}

export function cpuColor(percent: number): string {
  if (percent < 60) return "text-vps-green"
  if (percent < 80) return "text-vps-yellow"
  return "text-vps-red"
}
