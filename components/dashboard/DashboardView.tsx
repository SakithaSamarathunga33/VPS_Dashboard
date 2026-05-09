"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"

import { useContainers } from "@/hooks/useContainers"
import { useSystemStats } from "@/hooks/useSystemStats"
import { AgentErrorBanner } from "@/components/layout/AgentErrorBanner"
import { AreaChart, HBar, SparkLine } from "@/components/charts"
import { formatBytes, formatUptime } from "@/lib/utils"
import { useSWRConfig } from "swr"

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="font-mono text-[10px] font-semibold uppercase tracking-widest"
      style={{ opacity: 0.45, letterSpacing: "0.08em" }}
    >
      {children}
    </div>
  )
}

function Val({ children, size = 28, color }: { children: React.ReactNode; size?: number; color?: string }) {
  return (
    <div
      className="font-mono font-semibold leading-none tabular-nums"
      style={{ fontSize: size, color }}
    >
      {children}
    </div>
  )
}

function DashCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={className}
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "18px 20px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
      }}
    >
      {children}
    </div>
  )
}

function StatusDot({ status }: { status: string }) {
  const color = status === "running" ? "#8ed8ad" : "#6b7280"
  return (
    <span
      className="inline-block shrink-0 rounded-full"
      style={{
        width: 7,
        height: 7,
        background: color,
        boxShadow: status === "running" ? `0 0 6px ${color}` : "none",
      }}
    />
  )
}

const SSL_CERTS = [
  { domain: "api.example.dev", expires: 45, issuer: "Let's Encrypt", valid: true },
  { domain: "example.dev", expires: 45, issuer: "Let's Encrypt", valid: true },
  { domain: "monitor.example.dev", expires: 8, issuer: "Let's Encrypt", valid: true },
]

export function DashboardView() {
  const { mutate } = useSWRConfig()
  const { error: sysError, isValidating, stats } = useSystemStats()
  const { containers } = useContainers()

  const [cpuH, setCpuH] = useState<number[]>([])
  const [memH, setMemH] = useState<number[]>([])

  useEffect(() => {
    if (!stats) return
    setCpuH((h) => [...h, stats.cpu.usagePercent].slice(-60))
    setMemH((h) => [...h, stats.memory.usagePercent].slice(-60))
  }, [stats])

  const showBanner = Boolean(sysError && !stats)

  const cpu = stats?.cpu.usagePercent ?? 0
  const ram = stats?.memory.usagePercent ?? 0
  const disk = stats?.disk.usagePercent ?? 0

  const statCards = useMemo(
    () => [
      { label: "CPU Usage",  val: cpu,  unit: "%", data: cpuH, color: "#4aa2ab" },
      { label: "RAM Usage",  val: ram,  unit: "%", data: memH, color: "#8ed8ad" },
      { label: "Disk Used",  val: disk, unit: "%", data: null as number[] | null, color: "#1d5d82" },
      {
        label: "Uptime",
        val: null as number | null,
        unit: "",
        displayVal: stats ? formatUptime(stats.uptime) : "—",
        data: null as number[] | null,
        color: "#8b5cf6",
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cpu, ram, disk, cpuH, memH, stats?.uptime]
  )

  const runningCount = useMemo(
    () => containers.filter((c) => c.status === "running").length,
    [containers]
  )
  const totalCount = containers.length

  return (
    <div className="space-y-6">
      {showBanner && (
        <AgentErrorBanner
          isRetrying={isValidating}
          onRetry={() => {
            void mutate("system-stats")
            void mutate("containers")
          }}
        />
      )}

      {/* Server info bar */}
      <div className="flex flex-wrap items-center gap-3" style={{ fontSize: 13 }}>
        <div className="flex items-center gap-2">
          <StatusDot status="online" />
          <span className="font-semibold" style={{ fontSize: 15, color: "#f0f4f8" }}>
            {stats?.hostname ?? "—"}
          </span>
        </div>
        <span style={{ opacity: 0.3 }}>|</span>
        <span className="font-mono" style={{ opacity: 0.55 }}>{stats?.os ?? "—"}</span>
        {stats && (
          <span style={{ opacity: 0.55 }}>
            Up{" "}
            <span className="font-mono font-semibold" style={{ opacity: 1, color: "#8ed8ad" }}>
              {formatUptime(stats.uptime)}
            </span>
          </span>
        )}
        <div className="ml-auto flex gap-2">
          <span
            className="rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold"
            style={{ background: "rgba(142,216,173,0.15)", color: "#8ed8ad" }}
          >
            {runningCount}/{totalCount} containers
          </span>
          {stats && (
            <span
              className="rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold"
              style={{ background: "rgba(74,162,171,0.15)", color: "#4aa2ab" }}
            >
              {stats.cpu.cores} cores
            </span>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((s) => (
          <DashCard key={s.label}>
            <div className="mb-3 flex items-start justify-between">
              <Label>{s.label}</Label>
            </div>
            <Val
              size={32}
              color={
                s.val !== null
                  ? s.val > 85
                    ? "#ef4444"
                    : s.val > 70
                      ? "#f59e0b"
                      : s.color
                  : s.color
              }
            >
              {s.val !== null ? `${s.val.toFixed(1)}${s.unit}` : s.displayVal}
            </Val>
            {s.val !== null && (
              <div className="mt-3">
                <HBar value={s.val} color={s.color} height={4} />
              </div>
            )}
            {s.data && s.data.length > 1 && (
              <div className="mt-2.5">
                <SparkLine data={s.data} color={s.color} width={120} height={28} />
              </div>
            )}
          </DashCard>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <DashCard>
          <div className="mb-3 flex items-center justify-between">
            <Label>CPU — 60s</Label>
            <Val size={14} color="#4aa2ab">{cpu.toFixed(1)}%</Val>
          </div>
          <AreaChart data={cpuH} color="#4aa2ab" height={80} />
        </DashCard>
        <DashCard>
          <div className="mb-3 flex items-center justify-between">
            <Label>Memory — 60s</Label>
            <div className="flex gap-3" style={{ fontSize: 12 }}>
              <span style={{ color: "#8ed8ad" }}>Used {ram.toFixed(1)}%</span>
              {stats && (
                <span style={{ color: "#4aa2ab", opacity: 0.7 }}>
                  {formatBytes(stats.memory.used)} / {formatBytes(stats.memory.total)}
                </span>
              )}
            </div>
          </div>
          <AreaChart data={memH} color="#8ed8ad" height={80} />
        </DashCard>
      </div>

      {/* Bottom row: SSL, Disk, Docker summary */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* SSL Certs */}
        <DashCard>
          <Label>SSL Certificates</Label>
          <div className="mt-3 space-y-0">
            {SSL_CERTS.map((s) => (
              <div
                key={s.domain}
                className="flex items-center justify-between py-2"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#f0f4f8" }}>{s.domain}</div>
                  <div style={{ fontSize: 11, opacity: 0.45 }}>{s.issuer}</div>
                </div>
                <span
                  className="rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold"
                  style={
                    s.expires < 0
                      ? { background: "rgba(239,68,68,0.15)", color: "#ef4444" }
                      : s.expires < 14
                        ? { background: "rgba(245,158,11,0.15)", color: "#f59e0b" }
                        : { background: "rgba(142,216,173,0.15)", color: "#8ed8ad" }
                  }
                >
                  {s.expires < 0 ? "Expired" : `${s.expires}d`}
                </span>
              </div>
            ))}
          </div>
        </DashCard>

        {/* Disk */}
        <DashCard>
          <Label>Disk Usage</Label>
          {stats ? (
            <div className="mt-3 space-y-4">
              <div>
                <div className="mb-1.5 flex justify-between" style={{ fontSize: 13 }}>
                  <span style={{ color: "#f0f4f8", fontWeight: 500 }}>/</span>
                  <span
                    className="font-mono"
                    style={{ color: disk > 85 ? "#ef4444" : disk > 70 ? "#f59e0b" : "#f0f4f8" }}
                  >
                    {disk.toFixed(1)}%
                  </span>
                </div>
                <HBar value={disk} color="#1d5d82" height={5} />
                <div style={{ fontSize: 11, opacity: 0.45, marginTop: 4 }}>
                  {formatBytes(stats.disk.used)} used · {formatBytes(stats.disk.free)} free · {formatBytes(stats.disk.total)} total
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 pt-1">
                {[
                  { k: "Used", v: formatBytes(stats.disk.used), color: "#4aa2ab" },
                  { k: "Free", v: formatBytes(stats.disk.free), color: "#8ed8ad" },
                  { k: "Total", v: formatBytes(stats.disk.total), color: "#8899b0" },
                ].map(({ k, v, color }) => (
                  <div key={k}>
                    <div style={{ fontSize: 10, opacity: 0.45, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "monospace" }}>{k}</div>
                    <div className="font-mono text-sm font-semibold" style={{ color }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-3 text-sm" style={{ opacity: 0.4 }}>No data</div>
          )}
        </DashCard>

        {/* Docker summary */}
        <DashCard>
          <div className="mb-3 flex items-center justify-between">
            <Label>Docker Containers</Label>
            <Link href="/containers" className="font-mono text-[10px]" style={{ color: "#4aa2ab", opacity: 0.7 }}>
              View all →
            </Link>
          </div>
          {containers?.slice(0, 6).map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between py-1.5"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <div className="flex items-center gap-2">
                <StatusDot status={c.status} />
                <span style={{ fontSize: 13, color: "#f0f4f8" }}>{c.name}</span>
              </div>
              <span
                className="rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold"
                style={
                  c.status === "running"
                    ? { background: "rgba(142,216,173,0.12)", color: "#8ed8ad" }
                    : { background: "rgba(139,140,144,0.12)", color: "#8899b0" }
                }
              >
                {c.status}
              </span>
            </div>
          ))}
          {!containers?.length && (
            <div className="py-4 text-sm" style={{ opacity: 0.4 }}>No containers</div>
          )}
        </DashCard>
      </div>
    </div>
  )
}
