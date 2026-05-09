"use client"

import { useEffect, useMemo, useState } from "react"

import { useSystemStats } from "@/hooks/useSystemStats"
import { AreaChart, DualAreaChart, DonutChart, HBar } from "@/components/charts"
import { formatBytes } from "@/lib/utils"
import type { ProcessInfo } from "@/types/docker"

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="font-mono text-[10px] font-semibold uppercase tracking-widest"
      style={{ opacity: 0.45 }}
    >
      {children}
    </div>
  )
}

function Val({
  children,
  size = 22,
  color,
}: {
  children: React.ReactNode
  size?: number
  color?: string
}) {
  return (
    <div
      className="font-mono font-semibold tabular-nums"
      style={{ fontSize: size, color, lineHeight: 1.1 }}
    >
      {children}
    </div>
  )
}

function DashCard({
  children,
  style,
}: {
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "18px 20px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function CpuBar({ value }: { value: number }) {
  const color =
    value >= 80 ? "#ef4444" : value >= 50 ? "#f59e0b" : value >= 20 ? "#4aa2ab" : "#6b7280"
  return (
    <div className="flex items-center gap-2">
      <div
        className="relative h-1.5 flex-1 overflow-hidden rounded-full"
        style={{ background: "rgba(255,255,255,0.08)" }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
          style={{ width: `${Math.min(100, value)}%`, background: color }}
        />
      </div>
      <span className="w-10 text-right font-mono text-[11px] tabular-nums" style={{ color }}>
        {value.toFixed(1)}%
      </span>
    </div>
  )
}

export default function CPUPage() {
  const { stats } = useSystemStats()
  const [cpuH, setCpuH] = useState<number[]>([])
  const [memH, setMemH] = useState<number[]>([])
  const [processes, setProcesses] = useState<ProcessInfo[]>([])

  useEffect(() => {
    if (!stats) return
    setCpuH((h) => [...h, stats.cpu.usagePercent].slice(-60))
    setMemH((h) => [...h, stats.memory.usagePercent].slice(-60))
    setProcesses(stats.processes ?? [])
  }, [stats])

  const cpu = stats?.cpu.usagePercent ?? 0
  const ram = stats?.memory.usagePercent ?? 0
  const avg = useMemo(
    () => (cpuH.length > 0 ? cpuH.reduce((a, b) => a + b, 0) / cpuH.length : 0),
    [cpuH]
  )
  const peak = useMemo(
    () => (cpuH.length > 0 ? Math.max(...cpuH) : 0),
    [cpuH]
  )

  const memSegs = stats
    ? [
        { label: "Used", value: stats.memory.used, color: "#4aa2ab" },
        { label: "Free", value: stats.memory.free, color: "#8ed8ad" },
      ]
    : []

  return (
    <div className="space-y-5">
      {/* CPU + Memory combined 60s chart */}
      <DashCard>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <Label>CPU &amp; Memory — 60s history</Label>
          <div className="flex gap-4" style={{ fontSize: 12 }}>
            <span style={{ color: "#4aa2ab" }}>CPU {cpu.toFixed(1)}%</span>
            <span style={{ color: "#8ed8ad" }}>RAM {ram.toFixed(1)}%</span>
          </div>
        </div>
        <DualAreaChart
          dataA={cpuH}
          dataB={memH}
          colorA="#4aa2ab"
          colorB="#8ed8ad"
          height={120}
        />
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div>
            <Label>Current CPU</Label>
            <Val size={22} color={cpu > 85 ? "#ef4444" : cpu > 70 ? "#f59e0b" : "#4aa2ab"}>
              {cpu.toFixed(1)}%
            </Val>
          </div>
          <div>
            <Label>Avg (60s)</Label>
            <Val size={22}>{avg.toFixed(1)}%</Val>
          </div>
          <div>
            <Label>Peak (60s)</Label>
            <Val size={22} color={peak > 85 ? "#ef4444" : "#f59e0b"}>
              {peak.toFixed(1)}%
            </Val>
          </div>
        </div>
      </DashCard>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* CPU only chart */}
        <DashCard>
          <div className="mb-3 flex items-center justify-between">
            <Label>CPU — 60s</Label>
            <Val size={14} color="#4aa2ab">
              {cpu.toFixed(1)}%
            </Val>
          </div>
          <AreaChart data={cpuH} color="#4aa2ab" height={100} />
        </DashCard>

        {/* Memory breakdown */}
        <DashCard>
          <Label>Memory Breakdown</Label>
          <div className="mt-3 flex items-center gap-6">
            {memSegs.length > 0 && (
              <DonutChart segments={memSegs} size={110} strokeWidth={13} />
            )}
            <div className="flex-1 space-y-3">
              {memSegs.map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block rounded"
                      style={{ width: 8, height: 8, background: s.color }}
                    />
                    <span style={{ fontSize: 13, color: "#f0f4f8" }}>{s.label}</span>
                  </div>
                  <span className="font-mono text-[12px]" style={{ opacity: 0.7 }}>
                    {formatBytes(s.value)}
                  </span>
                </div>
              ))}
              {stats && (
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: 13, color: "#f0f4f8" }}>Total</span>
                  <span className="font-mono text-[12px]" style={{ opacity: 0.7 }}>
                    {formatBytes(stats.memory.total)}
                  </span>
                </div>
              )}
            </div>
          </div>
          {stats && (
            <div className="mt-4">
              <div className="mb-1.5 flex justify-between">
                <Label>RAM Used</Label>
                <Val size={14}>{ram.toFixed(1)}%</Val>
              </div>
              <HBar value={ram} color="#4aa2ab" height={6} />
              <div className="mt-1.5 font-mono text-[11px]" style={{ opacity: 0.45 }}>
                {formatBytes(stats.memory.used)} / {formatBytes(stats.memory.total)}
              </div>
            </div>
          )}
        </DashCard>
      </div>

      {/* CPU + system info */}
      {stats && (
        <DashCard>
          <Label>CPU Information</Label>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { k: "Model", v: stats.cpu.model },
              { k: "Cores", v: `${stats.cpu.cores} vCPU` },
              { k: "Current", v: `${cpu.toFixed(1)}%` },
              { k: "OS", v: stats.os },
            ].map(({ k, v }) => (
              <div key={k}>
                <div
                  className="font-mono text-[10px] font-semibold uppercase tracking-widest"
                  style={{ opacity: 0.45 }}
                >
                  {k}
                </div>
                <div className="mt-1 font-mono text-sm" style={{ color: "#f0f4f8" }}>
                  {v}
                </div>
              </div>
            ))}
          </div>
        </DashCard>
      )}

      {/* Real-time top processes */}
      <DashCard>
        <div className="mb-3 flex items-center justify-between">
          <Label>Top Processes — Live CPU Usage</Label>
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-1.5 w-1.5 animate-pulse rounded-full"
              style={{ background: "#4aa2ab" }}
            />
            <span className="font-mono text-[10px]" style={{ opacity: 0.45 }}>
              LIVE · {processes.length} tasks
            </span>
          </div>
        </div>

        {processes.length === 0 ? (
          <div
            className="py-8 text-center font-mono text-[12px]"
            style={{ opacity: 0.35 }}
          >
            Waiting for process data…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr
                  className="font-mono text-[10px] font-semibold uppercase tracking-widest"
                  style={{ opacity: 0.4 }}
                >
                  <th className="pb-2 pr-3 text-right" style={{ width: 52 }}>PID</th>
                  <th className="pb-2 pr-3" style={{ minWidth: 130 }}>Name</th>
                  <th className="pb-2 pr-3" style={{ minWidth: 180 }}>CPU Usage</th>
                  <th className="pb-2 pr-3" style={{ minWidth: 140 }}>MEM %</th>
                  <th className="pb-2 pr-3" style={{ minWidth: 90 }}>User</th>
                  <th className="pb-2" style={{ minWidth: 50 }}>State</th>
                </tr>
              </thead>
              <tbody>
                {processes.map((proc, i) => {
                  const isHot = proc.cpuPercent >= 50
                  const isWarm = proc.cpuPercent >= 20
                  const rowBg =
                    i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent"
                  return (
                    <tr
                      key={proc.pid}
                      style={{ background: rowBg, transition: "background 0.2s" }}
                    >
                      <td
                        className="py-1.5 pr-3 text-right font-mono text-[11px] tabular-nums"
                        style={{ opacity: 0.4 }}
                      >
                        {proc.pid}
                      </td>
                      <td className="py-1.5 pr-3">
                        <span
                          className="font-mono text-[12px] font-medium"
                          style={{
                            color: isHot
                              ? "#ef4444"
                              : isWarm
                              ? "#f59e0b"
                              : "#f0f4f8",
                          }}
                          title={proc.command}
                        >
                          {proc.name}
                        </span>
                      </td>
                      <td className="py-1.5 pr-3" style={{ minWidth: 180 }}>
                        <CpuBar value={proc.cpuPercent} />
                      </td>
                      <td className="py-1.5 pr-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="relative h-1.5 w-16 overflow-hidden rounded-full"
                            style={{ background: "rgba(255,255,255,0.08)" }}
                          >
                            <div
                              className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
                              style={{
                                width: `${Math.min(100, proc.memPercent)}%`,
                                background: "#8ed8ad",
                              }}
                            />
                          </div>
                          <span
                            className="w-10 text-right font-mono text-[11px] tabular-nums"
                            style={{ color: "#8ed8ad" }}
                          >
                            {proc.memPercent.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td
                        className="py-1.5 pr-3 font-mono text-[11px]"
                        style={{ opacity: 0.5 }}
                      >
                        {proc.user || "—"}
                      </td>
                      <td className="py-1.5">
                        <span
                          className="rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase"
                          style={{
                            background:
                              proc.state === "running"
                                ? "rgba(74,162,171,0.15)"
                                : "rgba(255,255,255,0.06)",
                            color:
                              proc.state === "running"
                                ? "#4aa2ab"
                                : "rgba(240,244,248,0.4)",
                          }}
                        >
                          {proc.state || "—"}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </DashCard>
    </div>
  )
}
