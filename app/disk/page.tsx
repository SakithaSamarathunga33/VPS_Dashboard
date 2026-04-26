"use client"

import { useSystemStats } from "@/hooks/useSystemStats"
import { HBar } from "@/components/charts"
import { formatBytes } from "@/lib/utils"

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-[10px] font-semibold uppercase tracking-widest" style={{ opacity: 0.45 }}>
      {children}
    </div>
  )
}

function DashCard({ children }: { children: React.ReactNode }) {
  return (
    <div
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

export default function DiskPage() {
  const { stats } = useSystemStats()

  const disk = stats?.disk
  const pct = disk ? disk.usagePercent : 0

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* Filesystem usage */}
        <DashCard>
          <Label>Filesystem Usage</Label>
          {disk ? (
            <div className="mt-4 space-y-4">
              <div>
                <div className="mb-1.5 flex justify-between" style={{ fontSize: 13 }}>
                  <div>
                    <span className="font-semibold" style={{ color: "#f0f4f8" }}>/</span>{" "}
                    <span className="font-mono text-[11px]" style={{ opacity: 0.4 }}>root filesystem</span>
                  </div>
                  <span
                    className="font-mono"
                    style={{ color: pct > 85 ? "#ef4444" : pct > 70 ? "#f59e0b" : "#f0f4f8" }}
                  >
                    {pct.toFixed(1)}%
                  </span>
                </div>
                <HBar value={pct} color="#1d5d82" height={6} />
                <div className="mt-1.5 font-mono text-[11px]" style={{ opacity: 0.45 }}>
                  {formatBytes(disk.used)} used · {formatBytes(disk.free)} free · {formatBytes(disk.total)} total
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-3 text-sm" style={{ opacity: 0.4 }}>No data</div>
          )}
        </DashCard>

        {/* Stats */}
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

      {/* Note */}
      <div
        className="rounded-xl px-5 py-4"
        style={{ background: "rgba(74,162,171,0.06)", border: "1px solid rgba(74,162,171,0.15)" }}
      >
        <p className="text-sm" style={{ color: "#8899b0" }}>
          <span className="font-semibold" style={{ color: "#4aa2ab" }}>Note:</span>{" "}
          Detailed per-filesystem I/O throughput requires additional agent instrumentation.
          The data above reflects the root filesystem reported by the agent.
        </p>
      </div>
    </div>
  )
}
