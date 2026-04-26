"use client"

import { useEffect, useState } from "react"

import { useSystemStats } from "@/hooks/useSystemStats"
import { AreaChart, DualAreaChart, DonutChart, HBar } from "@/components/charts"
import { formatBytes } from "@/lib/utils"

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

export default function CPUPage() {
  const { stats } = useSystemStats()
  const [cpuH, setCpuH] = useState<number[]>([])
  const [memH, setMemH] = useState<number[]>([])

  useEffect(() => {
    if (!stats) return
    setCpuH((h) => [...h, stats.cpu.usagePercent].slice(-60))
    setMemH((h) => [...h, stats.memory.usagePercent].slice(-60))
  }, [stats])

  const cpu = stats?.cpu.usagePercent ?? 0
  const ram = stats?.memory.usagePercent ?? 0
  const avg = cpuH.length > 0 ? cpuH.reduce((a, b) => a + b, 0) / cpuH.length : 0
  const peak = cpuH.length > 0 ? Math.max(...cpuH) : 0

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
    </div>
  )
}
