"use client"

import { useEffect, useState } from "react"
import { useSystemStats } from "@/hooks/useSystemStats"
import { AreaChart, DualAreaChart } from "@/components/charts"
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

export default function NetworkPage() {
  const { stats } = useSystemStats()

  const [rxH, setRxH] = useState<number[]>([])
  const [txH, setTxH] = useState<number[]>([])

  useEffect(() => {
    if (!stats?.network?.length) return
    const totalRx = stats.network.reduce((s, n) => s + n.rx_sec, 0)
    const totalTx = stats.network.reduce((s, n) => s + n.tx_sec, 0)
    setRxH((h) => [...h, totalRx].slice(-60))
    setTxH((h) => [...h, totalTx].slice(-60))
  }, [stats])

  const primaryIface = stats?.network?.[0]
  const totalRx = stats?.network?.reduce((s, n) => s + n.rx_sec, 0) ?? 0
  const totalTx = stats?.network?.reduce((s, n) => s + n.tx_sec, 0) ?? 0
  const peakRx = rxH.length > 0 ? Math.max(...rxH) : 0
  const peakTx = txH.length > 0 ? Math.max(...txH) : 0

  const hasData = !!stats?.network?.length

  return (
    <div className="space-y-5">
      {/* Combined 60s chart */}
      <DashCard>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <Label>Bandwidth — 60s history</Label>
          <div className="flex gap-4" style={{ fontSize: 12 }}>
            <span style={{ color: "#4aa2ab" }}>↓ {formatSpeed(totalRx)}</span>
            <span style={{ color: "#8ed8ad" }}>↑ {formatSpeed(totalTx)}</span>
          </div>
        </div>
        {hasData ? (
          <DualAreaChart dataA={rxH} dataB={txH} colorA="#4aa2ab" colorB="#8ed8ad" height={120} />
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
            <Label>RX Now</Label>
            <Val size={20} color="#4aa2ab">{formatSpeed(totalRx)}</Val>
          </div>
          <div>
            <Label>TX Now</Label>
            <Val size={20} color="#8ed8ad">{formatSpeed(totalTx)}</Val>
          </div>
          <div>
            <Label>Peak RX (60s)</Label>
            <Val size={20}>{formatSpeed(peakRx)}</Val>
          </div>
          <div>
            <Label>Peak TX (60s)</Label>
            <Val size={20}>{formatSpeed(peakTx)}</Val>
          </div>
        </div>
      </DashCard>

      {/* Per-direction charts */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <DashCard>
          <div className="mb-3 flex items-center justify-between">
            <Label>Inbound RX</Label>
            <Val size={13} color="#4aa2ab">{formatSpeed(totalRx)}</Val>
          </div>
          {hasData ? (
            <AreaChart data={rxH} color="#4aa2ab" height={100} />
          ) : (
            <div
              className="flex items-center justify-center rounded-lg"
              style={{ height: 100, background: "rgba(255,255,255,0.02)", border: "1px dashed var(--border)" }}
            >
              <span className="text-sm" style={{ opacity: 0.3 }}>Waiting…</span>
            </div>
          )}
        </DashCard>
        <DashCard>
          <div className="mb-3 flex items-center justify-between">
            <Label>Outbound TX</Label>
            <Val size={13} color="#8ed8ad">{formatSpeed(totalTx)}</Val>
          </div>
          {hasData ? (
            <AreaChart data={txH} color="#8ed8ad" height={100} />
          ) : (
            <div
              className="flex items-center justify-center rounded-lg"
              style={{ height: 100, background: "rgba(255,255,255,0.02)", border: "1px dashed var(--border)" }}
            >
              <span className="text-sm" style={{ opacity: 0.3 }}>Waiting…</span>
            </div>
          )}
        </DashCard>
      </div>

      {/* Per-interface table */}
      <DashCard>
        <Label>Network Interfaces</Label>
        <div className="mt-3 overflow-hidden rounded-lg" style={{ border: "1px solid var(--border)" }}>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {["Interface", "RX Speed", "TX Speed", "Total RX", "Total TX"].map((h) => (
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
              {hasData ? (
                stats!.network.map((iface) => (
                  <tr key={iface.iface}>
                    <td className="px-3 py-2.5" style={{ borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                      <span className="font-mono font-semibold" style={{ color: "#f0f4f8" }}>{iface.iface}</span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[12px]" style={{ borderBottom: "1px solid var(--border)", color: "#4aa2ab" }}>
                      ↓ {formatSpeed(iface.rx_sec)}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[12px]" style={{ borderBottom: "1px solid var(--border)", color: "#8ed8ad" }}>
                      ↑ {formatSpeed(iface.tx_sec)}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[12px]" style={{ borderBottom: "1px solid var(--border)", opacity: 0.6 }}>
                      {formatBytes(iface.rx_bytes)}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[12px]" style={{ borderBottom: "1px solid var(--border)", opacity: 0.6 }}>
                      {formatBytes(iface.tx_bytes)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center font-mono text-sm" style={{ opacity: 0.3 }}>
                    Connecting to stream…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {primaryIface && (
          <div className="mt-3 font-mono text-[11px]" style={{ opacity: 0.4 }}>
            Primary interface: {primaryIface.iface}
          </div>
        )}
      </DashCard>
    </div>
  )
}
