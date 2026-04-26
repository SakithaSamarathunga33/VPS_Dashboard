"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"

import { useSystemStats } from "@/hooks/useSystemStats"

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Overview",
  "/cpu": "CPU & Memory",
  "/containers": "Docker Containers",
  "/disk": "Disk & I/O",
  "/network": "Network Traffic",
  "/processes": "Processes",
  "/logs": "Live Logs",
  "/alerts": "Alerts & Thresholds",
  "/settings": "Settings",
}

function MiniBar({ value, color }: { value: number; color: string }) {
  const pct = Math.min(100, Math.max(0, value))
  const barColor = pct > 85 ? "#ef4444" : pct > 70 ? "#f59e0b" : color
  return (
    <div
      className="relative overflow-hidden rounded-full"
      style={{ width: 48, height: 4, background: "rgba(255,255,255,0.08)" }}
    >
      <div
        className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: barColor }}
      />
    </div>
  )
}

export function TopBar() {
  const pathname = usePathname()
  const { stats, error } = useSystemStats()
  const [now, setNow] = useState(() => new Date())

  const connected = Boolean(stats) && !error
  const cpu = stats?.cpu.usagePercent ?? 0
  const ram = stats?.memory.usagePercent ?? 0

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const title = PAGE_TITLES[pathname] ?? PAGE_TITLES[Object.keys(PAGE_TITLES).find(k => pathname.startsWith(k)) ?? ""] ?? "VPS Monitor"

  return (
    <header
      className="sticky top-0 z-20 flex h-[52px] items-center gap-3 px-6"
      style={{
        background: "var(--card)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <h1
        className="text-[15px] font-semibold"
        style={{ color: "#f0f4f8", letterSpacing: "-0.01em" }}
      >
        {title}
      </h1>

      <div className="ml-auto flex items-center gap-5">
        {/* CPU mini bar */}
        {stats && (
          <>
            <div className="flex items-center gap-2">
              <span
                className="font-mono text-[11px] font-semibold uppercase tracking-widest"
                style={{ opacity: 0.45, color: "#f0f4f8" }}
              >
                CPU
              </span>
              <span
                className="font-mono text-[13px] font-semibold tabular-nums"
                style={{
                  color: cpu > 85 ? "#ef4444" : cpu > 70 ? "#f59e0b" : "#4aa2ab",
                }}
              >
                {Math.round(cpu)}%
              </span>
              <MiniBar value={cpu} color="#4aa2ab" />
            </div>

            {/* RAM mini bar */}
            <div className="flex items-center gap-2">
              <span
                className="font-mono text-[11px] font-semibold uppercase tracking-widest"
                style={{ opacity: 0.45, color: "#f0f4f8" }}
              >
                RAM
              </span>
              <span
                className="font-mono text-[13px] font-semibold tabular-nums"
                style={{
                  color: ram > 85 ? "#ef4444" : ram > 70 ? "#f59e0b" : "#8ed8ad",
                }}
              >
                {Math.round(ram)}%
              </span>
              <MiniBar value={ram} color="#8ed8ad" />
            </div>

            {/* Divider */}
            <div style={{ width: 1, height: 16, background: "var(--border)" }} />
          </>
        )}

        {/* Clock */}
        <time
          className="font-mono text-[12px] tabular-nums"
          style={{ opacity: 0.45, color: "#f0f4f8" }}
          dateTime={now.toISOString()}
        >
          {now.toLocaleTimeString()}
        </time>

        {/* Connection dot */}
        <div
          className="size-2 rounded-full"
          style={{
            background: connected ? "#8ed8ad" : "#6b7280",
            boxShadow: connected ? "0 0 6px #8ed8ad80" : "none",
          }}
          title={connected ? "Connected" : "Offline"}
        />
      </div>
    </header>
  )
}
