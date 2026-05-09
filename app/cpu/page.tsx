"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import { useSystemStats } from "@/hooks/useSystemStats"
import { AreaChart, DualAreaChart, DonutChart, HBar } from "@/components/charts"
import { formatBytes } from "@/lib/utils"
import type { ProcessInfo } from "@/types/docker"

// ---------------------------------------------------------------------------
// Spike / suspicious tracking
// ---------------------------------------------------------------------------
const SPIKE_THRESHOLD = 3          // % CPU that qualifies as a spike
const SPIKE_RETAIN_MS = 60_000     // keep spike records for 60 s

interface SpikeEntry {
  pid: number
  name: string
  user: string
  command: string
  peakCpu: number
  currentCpu: number
  memPercent: number
  state: string
  firstSeenAt: number
  lastSpikeAt: number
  spikeCount: number
  suspicious: boolean
  reasons: string[]
}

/** Heuristic suspicious-process detection */
function detectSuspicious(p: ProcessInfo): string[] {
  const reasons: string[] = []
  if (p.state === "zombie") reasons.push("Zombie process")
  if (p.cpuPercent > 50) reasons.push("Very high CPU (>50%)")
  else if (p.cpuPercent > 20) reasons.push("High CPU (>20%)")
  if (p.user === "root" && p.cpuPercent > 10)
    reasons.push("Root process with elevated CPU")
  // Names that look like random hashes / crypto miners
  if (/^[a-f0-9]{8,}$/i.test(p.name)) reasons.push("Random hex name")
  if (/xmr|minerd|miner|kworker\/u\d+|cryptonight/i.test(p.name))
    reasons.push("Possible crypto miner")
  if (p.name.startsWith(".") || p.name.includes("/"))
    reasons.push("Unusual process name")
  return reasons
}

// ---------------------------------------------------------------------------
// Small UI atoms
// ---------------------------------------------------------------------------
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

function Badge({
  children,
  color,
  bg,
}: {
  children: React.ReactNode
  color: string
  bg: string
}) {
  return (
    <span
      className="rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase"
      style={{ background: bg, color }}
    >
      {children}
    </span>
  )
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 5) return "just now"
  if (s < 60) return `${s}s ago`
  return `${Math.floor(s / 60)}m ago`
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function CPUPage() {
  const { stats } = useSystemStats()
  const [cpuH, setCpuH] = useState<number[]>([])
  const [memH, setMemH] = useState<number[]>([])
  const [processes, setProcesses] = useState<ProcessInfo[]>([])
  const [spikes, setSpikes] = useState<SpikeEntry[]>([])

  // Persistent spike log: pid → SpikeEntry
  const spikeMap = useRef<Map<number, SpikeEntry>>(new Map())

  useEffect(() => {
    if (!stats) return

    setCpuH((h) => [...h, stats.cpu.usagePercent].slice(-60))
    setMemH((h) => [...h, stats.memory.usagePercent].slice(-60))
    setProcesses(stats.processes ?? [])

    const now = Date.now()
    const map = spikeMap.current

    // Update spike map
    for (const p of stats.processes ?? []) {
      const reasons = detectSuspicious(p)
      const isSuspicious = reasons.length > 0
      const isSpike = p.cpuPercent >= SPIKE_THRESHOLD

      if (!isSpike && !isSuspicious) continue

      const existing = map.get(p.pid)
      if (existing) {
        existing.currentCpu = p.cpuPercent
        existing.memPercent = p.memPercent
        existing.state = p.state
        if (p.cpuPercent > existing.peakCpu) existing.peakCpu = p.cpuPercent
        if (isSpike) {
          existing.lastSpikeAt = now
          existing.spikeCount += 1
        }
        existing.suspicious = isSuspicious
        existing.reasons = reasons
      } else {
        map.set(p.pid, {
          pid: p.pid,
          name: p.name,
          user: p.user,
          command: p.command,
          peakCpu: p.cpuPercent,
          currentCpu: p.cpuPercent,
          memPercent: p.memPercent,
          state: p.state,
          firstSeenAt: now,
          lastSpikeAt: now,
          spikeCount: 1,
          suspicious: isSuspicious,
          reasons,
        })
      }
    }

    // Prune stale entries
    for (const [pid, entry] of map.entries()) {
      if (now - entry.lastSpikeAt > SPIKE_RETAIN_MS) map.delete(pid)
    }

    // Sort: suspicious first, then by peak CPU
    const sorted = [...map.values()].sort((a, b) => {
      if (a.suspicious !== b.suspicious) return a.suspicious ? -1 : 1
      return b.peakCpu - a.peakCpu
    })

    setSpikes(sorted)
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

  const suspiciousCount = spikes.filter((s) => s.suspicious).length

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

      {/* ------------------------------------------------------------------ */}
      {/* Spike Monitor + Suspicious Processes                                */}
      {/* ------------------------------------------------------------------ */}
      <DashCard
        style={{
          border: suspiciousCount > 0
            ? "1px solid rgba(239,68,68,0.35)"
            : "1px solid var(--border)",
        }}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Label>Spike Monitor &amp; Suspicious Processes</Label>
            {suspiciousCount > 0 && (
              <span
                className="animate-pulse rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase"
                style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}
              >
                ⚠ {suspiciousCount} suspicious
              </span>
            )}
          </div>
          <span className="font-mono text-[10px]" style={{ opacity: 0.4 }}>
            Tracking last 60 s · threshold ≥{SPIKE_THRESHOLD}% CPU
          </span>
        </div>

        {spikes.length === 0 ? (
          <div
            className="flex flex-col items-center gap-2 py-8 text-center"
            style={{ opacity: 0.35 }}
          >
            <span className="font-mono text-[13px]">No spikes detected</span>
            <span className="font-mono text-[11px]">
              Processes will appear here when CPU usage exceeds {SPIKE_THRESHOLD}%
            </span>
          </div>
        ) : (
          <div className="space-y-2">
            {spikes.map((entry) => {
              const isSuspicious = entry.suspicious
              const isZombie = entry.state === "zombie"
              const cpuColor =
                entry.currentCpu >= 80
                  ? "#ef4444"
                  : entry.currentCpu >= 40
                  ? "#f59e0b"
                  : entry.currentCpu >= 10
                  ? "#4aa2ab"
                  : "#6b7280"
              const peakColor =
                entry.peakCpu >= 80
                  ? "#ef4444"
                  : entry.peakCpu >= 40
                  ? "#f59e0b"
                  : "#4aa2ab"

              return (
                <div
                  key={entry.pid}
                  className="rounded-lg px-4 py-3"
                  style={{
                    background: isSuspicious
                      ? "rgba(239,68,68,0.06)"
                      : "rgba(255,255,255,0.03)",
                    border: isSuspicious
                      ? "1px solid rgba(239,68,68,0.2)"
                      : "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  {/* Row 1: name + badges + timestamps */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="font-mono text-[13px] font-semibold"
                        style={{ color: isSuspicious ? "#ef4444" : "#f0f4f8" }}
                        title={entry.command}
                      >
                        {entry.name}
                      </span>
                      <span
                        className="font-mono text-[11px]"
                        style={{ opacity: 0.4 }}
                      >
                        PID {entry.pid}
                      </span>

                      {/* Badges */}
                      {isZombie && (
                        <Badge color="#ef4444" bg="rgba(239,68,68,0.15)">
                          zombie
                        </Badge>
                      )}
                      {isSuspicious && !isZombie && (
                        <Badge color="#f59e0b" bg="rgba(245,158,11,0.15)">
                          suspicious
                        </Badge>
                      )}
                      {entry.spikeCount > 5 && (
                        <Badge color="#a78bfa" bg="rgba(167,139,250,0.12)">
                          {entry.spikeCount}× spikes
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-[11px]" style={{ opacity: 0.4 }}>
                        Last spike {timeAgo(entry.lastSpikeAt)}
                      </span>
                    </div>
                  </div>

                  {/* Row 2: metrics */}
                  <div className="mt-2.5 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
                    <div>
                      <div className="font-mono text-[10px]" style={{ opacity: 0.4 }}>
                        Current CPU
                      </div>
                      <div
                        className="font-mono text-[14px] font-semibold tabular-nums"
                        style={{ color: cpuColor }}
                      >
                        {entry.currentCpu.toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div className="font-mono text-[10px]" style={{ opacity: 0.4 }}>
                        Peak CPU
                      </div>
                      <div
                        className="font-mono text-[14px] font-semibold tabular-nums"
                        style={{ color: peakColor }}
                      >
                        {entry.peakCpu.toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div className="font-mono text-[10px]" style={{ opacity: 0.4 }}>
                        MEM %
                      </div>
                      <div
                        className="font-mono text-[14px] font-semibold tabular-nums"
                        style={{ color: "#8ed8ad" }}
                      >
                        {entry.memPercent.toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div className="font-mono text-[10px]" style={{ opacity: 0.4 }}>
                        User / State
                      </div>
                      <div className="font-mono text-[12px]" style={{ color: "#f0f4f8", opacity: 0.7 }}>
                        {entry.user || "—"} /{" "}
                        <span
                          style={{
                            color:
                              entry.state === "running"
                                ? "#4aa2ab"
                                : entry.state === "zombie"
                                ? "#ef4444"
                                : undefined,
                          }}
                        >
                          {entry.state || "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Row 3: peak CPU bar */}
                  <div className="mt-2.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="relative h-1 flex-1 overflow-hidden rounded-full"
                        style={{ background: "rgba(255,255,255,0.07)" }}
                      >
                        <div
                          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, entry.peakCpu)}%`,
                            background: peakColor,
                            opacity: 0.6,
                          }}
                        />
                        <div
                          className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(100, entry.currentCpu)}%`,
                            background: cpuColor,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Row 4: suspicious reasons */}
                  {isSuspicious && entry.reasons.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {entry.reasons.map((r) => (
                        <span
                          key={r}
                          className="rounded px-1.5 py-0.5 font-mono text-[10px]"
                          style={{
                            background: "rgba(239,68,68,0.1)",
                            color: "#fca5a5",
                          }}
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </DashCard>

      {/* ------------------------------------------------------------------ */}
      {/* Real-time top processes table                                        */}
      {/* ------------------------------------------------------------------ */}
      <DashCard>
        <div className="mb-3 flex items-center justify-between">
          <Label>All Processes — Live CPU Usage</Label>
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
                  const isZombie = proc.state === "zombie"
                  const rowBg = i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent"
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
                            color: isZombie
                              ? "#ef4444"
                              : isHot
                              ? "#ef4444"
                              : isWarm
                              ? "#f59e0b"
                              : "#f0f4f8",
                          }}
                          title={proc.command}
                        >
                          {proc.name}
                        </span>
                        {isZombie && (
                          <span
                            className="ml-1.5 rounded px-1 py-0.5 font-mono text-[9px] font-bold uppercase"
                            style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}
                          >
                            zombie
                          </span>
                        )}
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
                                : isZombie
                                ? "rgba(239,68,68,0.15)"
                                : "rgba(255,255,255,0.06)",
                            color:
                              proc.state === "running"
                                ? "#4aa2ab"
                                : isZombie
                                ? "#ef4444"
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
