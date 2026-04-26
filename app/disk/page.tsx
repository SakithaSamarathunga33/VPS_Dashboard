"use client"

import { useEffect, useState } from "react"
import { useSystemStats } from "@/hooks/useSystemStats"
import { HBar, DualAreaChart } from "@/components/charts"
import { formatBytes } from "@/lib/utils"

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-[10px] font-semibold uppercase tracking-widest" style={{ opacity: 0.45 }}>
      {children}
    </div>
  )
}

function Val({ children, size = 22, color }: { children: React.ReactNode; size?: number; color?: string }) {
  return (
    <div className="font-mono font-semibold tabular-nums" style={{ fontSize: size, color, lineHeight: 1.1 }}>
      {children}
    </div>
  )
}

function DashCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
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

function formatSpeed(bytesPerSec: number) {
  if (bytesPerSec >= 1_000_000) return `${(bytesPerSec / 1_000_000).toFixed(1)} MB/s`
  if (bytesPerSec >= 1_000) return `${(bytesPerSec / 1_000).toFixed(1)} KB/s`
  return `${bytesPerSec.toFixed(0)} B/s`
}

export default function DiskPage() {
  const { stats } = useSystemStats()

  const [readH, setReadH] = useState<number[]>([])
  const [writeH, setWriteH] = useState<number[]>([])

  useEffect(() => {
    if (!stats?.disk) return
    setReadH((h) => [...h, stats.disk.io.read_sec].slice(-60))
    setWriteH((h) => [...h, stats.disk.io.write_sec].slice(-60))
  }, [stats])

  const disk = stats?.disk
  const pct = disk?.usagePercent ?? 0
  const readSec = disk?.io.read_sec ?? 0
  const writeSec = disk?.io.write_sec ?? 0
  const peakRead = readH.length > 0 ? Math.max(...readH) : 0
  const peakWrite = writeH.length > 0 ? Math.max(...writeH) : 0

  return (
    <div className="space-y-5">
      {/* I/O throughput chart */}
      <DashCard>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <Label>Disk I/O — 60s history</Label>
          <div className="flex gap-4" style={{ fontSize: 12 }}>
            <span style={{ color: "#4aa2ab" }}>R {formatSpeed(readSec)}</span>
            <span style={{ color: "#8ed8ad" }}>W {formatSpeed(writeSec)}</span>
          </div>
        </div>
        {disk ? (
          <DualAreaChart dataA={readH} dataB={writeH} colorA="#4aa2ab" colorB="#8ed8ad" height={120} />
        ) : (
          <div
            className="flex items-center justify-center rounded-lg"
            style={{ height: 120, background: "rgba(255,255,255,0.02)", border: "1px dashed var(--border)" }}
          >
            <span className="font-mono text-sm" style={{ opacity: 0.3 }}>Waiting for stream…</span>
          </div>
        )}
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <Label>Read Now</Label>
            <Val size={20} color="#4aa2ab">{formatSpeed(readSec)}</Val>
          </div>
          <div>
            <Label>Write Now</Label>
            <Val size={20} color="#8ed8ad">{formatSpeed(writeSec)}</Val>
          </div>
          <div>
            <Label>Peak Read</Label>
            <Val size={20}>{formatSpeed(peakRead)}</Val>
          </div>
          <div>
            <Label>Peak Write</Label>
            <Val size={20}>{formatSpeed(peakWrite)}</Val>
          </div>
        </div>
      </DashCard>

      {/* Per-filesystem table */}
      <DashCard>
        <Label>Filesystems</Label>
        <div className="mt-3 overflow-hidden rounded-lg" style={{ border: "1px solid var(--border)" }}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ minWidth: 520 }}>
              <thead>
                <tr>
                  {["Mount", "Filesystem", "Type", "Used / Total", "Usage"].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2.5 text-left font-mono text-[11px] font-semibold uppercase tracking-widest"
                      style={{ opacity: 0.45, borderBottom: "1px solid var(--border)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {disk?.filesystems?.length ? (
                  disk.filesystems.map((f) => (
                    <tr key={f.mount}>
                      <td className="px-3 py-2.5" style={{ borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                        <span className="font-mono font-semibold" style={{ color: "#f0f4f8" }}>{f.mount}</span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11px]" style={{ borderBottom: "1px solid var(--border)", opacity: 0.55 }}>
                        {f.fs}
                      </td>
                      <td className="px-3 py-2.5" style={{ borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                        <span className="font-mono text-[11px]" style={{ opacity: 0.5 }}>{f.type || "—"}</span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11px]" style={{ borderBottom: "1px solid var(--border)", opacity: 0.7 }}>
                        {formatBytes(f.used)} / {formatBytes(f.size)}
                      </td>
                      <td className="px-3 py-2.5" style={{ borderBottom: "1px solid var(--border)", minWidth: 120 }}>
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <HBar
                              value={f.usagePercent}
                              color={f.usagePercent > 85 ? "#ef4444" : f.usagePercent > 70 ? "#f59e0b" : "#1d5d82"}
                              height={4}
                            />
                          </div>
                          <span
                            className="font-mono text-[11px] tabular-nums"
                            style={{ color: f.usagePercent > 85 ? "#ef4444" : f.usagePercent > 70 ? "#f59e0b" : "#f0f4f8", minWidth: 36, textAlign: "right" }}
                          >
                            {f.usagePercent.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center font-mono text-sm" style={{ opacity: 0.3 }}>
                      {disk ? "No filesystems reported" : "Connecting to stream…"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </DashCard>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <DashCard>
          <Label>Root Filesystem</Label>
          {disk ? (
            <div className="mt-4 space-y-3">
              <div>
                <div className="mb-1.5 flex justify-between" style={{ fontSize: 13 }}>
                  <span className="font-semibold" style={{ color: "#f0f4f8" }}>/</span>
                  <span
                    className="font-mono"
                    style={{ color: pct > 85 ? "#ef4444" : pct > 70 ? "#f59e0b" : "#f0f4f8" }}
                  >
                    {pct.toFixed(1)}%
                  </span>
                </div>
                <HBar value={pct} color={pct > 85 ? "#ef4444" : pct > 70 ? "#f59e0b" : "#1d5d82"} height={6} />
                <div className="mt-1.5 font-mono text-[11px]" style={{ opacity: 0.45 }}>
                  {formatBytes(disk.used)} used · {formatBytes(disk.free)} free · {formatBytes(disk.total)} total
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-3 text-sm" style={{ opacity: 0.4 }}>No data</div>
          )}
        </DashCard>

        <DashCard>
          <Label>Storage Summary</Label>
          {disk ? (
            <div className="mt-4 space-y-3">
              {[
                { k: "Total", v: formatBytes(disk.total), color: "#8899b0" },
                { k: "Used", v: formatBytes(disk.used), color: "#4aa2ab" },
                { k: "Free", v: formatBytes(disk.free), color: "#8ed8ad" },
                { k: "Usage", v: `${pct.toFixed(1)}%`, color: pct > 85 ? "#ef4444" : pct > 70 ? "#f59e0b" : "#f0f4f8" },
              ].map(({ k, v, color }) => (
                <div
                  key={k}
                  className="flex justify-between py-2"
                  style={{ borderBottom: "1px solid var(--border)", fontSize: 13 }}
                >
                  <span style={{ opacity: 0.55 }}>{k}</span>
                  <span className="font-mono" style={{ color }}>{v}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3 text-sm" style={{ opacity: 0.4 }}>No data</div>
          )}
        </DashCard>
      </div>
    </div>
  )
}
