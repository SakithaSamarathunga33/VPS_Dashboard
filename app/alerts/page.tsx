"use client"

import { useState } from "react"

import { useSystemStats } from "@/hooks/useSystemStats"
import { useSSLCerts } from "@/hooks/useSSLCerts"

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

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-[10px] font-semibold uppercase tracking-widest" style={{ opacity: 0.45 }}>
      {children}
    </div>
  )
}

type Alert = {
  id: number
  level: "critical" | "warning" | "info"
  metric: string
  message: string
  time: string
  ack: boolean
}

const LEVEL_STYLES: Record<string, { bg: string; color: string }> = {
  critical: { bg: "rgba(239,68,68,0.12)", color: "#ef4444" },
  warning: { bg: "rgba(245,158,11,0.12)", color: "#f59e0b" },
  info: { bg: "rgba(74,162,171,0.12)", color: "#4aa2ab" },
}

const INITIAL_ALERTS: Alert[] = [
  { id: 1, level: "warning", metric: "CPU", message: "CPU exceeded 80% threshold for more than 5 minutes.", time: "14m ago", ack: false },
  { id: 2, level: "info", metric: "Docker", message: "One or more containers are in exited state.", time: "2h ago", ack: false },
  { id: 3, level: "info", metric: "Disk", message: "Disk usage above 60% — monitor closely.", time: "4h ago", ack: true },
]

const SSL_STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  ok:      { bg: "rgba(142,216,173,0.12)", color: "#8ed8ad", label: "ok" },
  warning: { bg: "rgba(245,158,11,0.12)",  color: "#f59e0b", label: "expiring" },
  expired: { bg: "rgba(239,68,68,0.12)",   color: "#ef4444", label: "expired" },
  error:   { bg: "rgba(107,114,128,0.12)", color: "#8899b0", label: "error" },
}

export default function AlertsPage() {
  const { stats } = useSystemStats()
  const [alerts, setAlerts] = useState<Alert[]>(INITIAL_ALERTS)
  const [thresholds, setThresholds] = useState({ cpu: 80, ram: 85, disk: 90 })
  const { certs, loading: sslLoading, addDomain, removeDomain } = useSSLCerts()
  const [newDomain, setNewDomain] = useState("")
  const [adding, setAdding] = useState(false)

  const cpu = stats?.cpu.usagePercent ?? 0
  const ram = stats?.memory.usagePercent ?? 0
  const disk = stats?.disk.usagePercent ?? 0

  const liveAlerts: Alert[] = [
    ...(cpu > thresholds.cpu ? [{ id: 100, level: "warning" as const, metric: "CPU", message: `CPU at ${cpu.toFixed(1)}% — above ${thresholds.cpu}% threshold`, time: "now", ack: false }] : []),
    ...(ram > thresholds.ram ? [{ id: 101, level: "critical" as const, metric: "RAM", message: `RAM at ${ram.toFixed(1)}% — above ${thresholds.ram}% threshold`, time: "now", ack: false }] : []),
    ...(disk > thresholds.disk ? [{ id: 102, level: "critical" as const, metric: "Disk", message: `Disk at ${disk.toFixed(1)}% — above ${thresholds.disk}% threshold`, time: "now", ack: false }] : []),
  ]

  const allAlerts = [...liveAlerts, ...alerts]

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* Alerts list */}
        <DashCard>
          <Label>Active Alerts</Label>
          <div className="mt-3 space-y-0">
            {allAlerts.map((a) => {
              const s = LEVEL_STYLES[a.level]
              return (
                <div
                  key={a.id}
                  className="flex items-start gap-3 py-3"
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold"
                    style={{ background: s.bg, color: s.color }}
                  >
                    {a.level}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold" style={{ color: "#f0f4f8" }}>{a.metric}</div>
                    <div className="text-[12px]" style={{ color: "#8899b0" }}>{a.message}</div>
                    <div className="mt-0.5 font-mono text-[11px]" style={{ opacity: 0.4 }}>{a.time}</div>
                  </div>
                  {!a.ack && a.id < 100 && (
                    <button
                      onClick={() => setAlerts((prev) => prev.map((x) => x.id === a.id ? { ...x, ack: true } : x))}
                      className="shrink-0 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors"
                      style={{ border: "1px solid var(--border)", color: "#8899b0" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)" }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "" }}
                    >
                      Acknowledge
                    </button>
                  )}
                  {a.ack && (
                    <span className="shrink-0 font-mono text-[11px]" style={{ opacity: 0.35 }}>ack&apos;d</span>
                  )}
                </div>
              )
            })}
            {allAlerts.length === 0 && (
              <div className="py-6 text-center text-sm" style={{ opacity: 0.4 }}>
                No active alerts — all systems normal
              </div>
            )}
          </div>
        </DashCard>

        {/* Thresholds */}
        <DashCard>
          <Label>Alert Thresholds</Label>
          <div className="mt-4 space-y-6">
            {[
              { key: "cpu" as const, label: "CPU Usage", unit: "%", max: 100 },
              { key: "ram" as const, label: "RAM Usage", unit: "%", max: 100 },
              { key: "disk" as const, label: "Disk Usage", unit: "%", max: 100 },
            ].map(({ key, label, unit, max }) => (
              <div key={key}>
                <div className="mb-2 flex justify-between">
                  <Label>{label}</Label>
                  <span className="font-mono text-[13px]" style={{ color: "#4aa2ab" }}>
                    {thresholds[key]}{unit}
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={max}
                  value={thresholds[key]}
                  onChange={(e) => setThresholds((p) => ({ ...p, [key]: Number(e.target.value) }))}
                  className="w-full"
                  style={{ accentColor: "#4aa2ab", height: 4 }}
                />
              </div>
            ))}
          </div>
        </DashCard>
      </div>

      {/* SSL Certificates */}
      <DashCard>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <Label>SSL Certificates</Label>
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              if (!newDomain.trim()) return
              setAdding(true)
              await addDomain(newDomain.trim())
              setNewDomain("")
              setAdding(false)
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="example.com"
              className="rounded-md px-3 py-1.5 font-mono text-[12px] outline-none"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid var(--border)",
                color: "#f0f4f8",
                width: 180,
              }}
            />
            <button
              type="submit"
              disabled={adding || !newDomain.trim()}
              className="rounded-md px-3 py-1.5 font-mono text-[12px] font-semibold transition-colors"
              style={{
                background: "rgba(74,162,171,0.15)",
                border: "1px solid rgba(74,162,171,0.3)",
                color: "#4aa2ab",
                opacity: adding || !newDomain.trim() ? 0.5 : 1,
              }}
            >
              {adding ? "Checking…" : "Add"}
            </button>
          </form>
        </div>

        <div className="overflow-hidden rounded-lg" style={{ border: "1px solid var(--border)" }}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ minWidth: 480 }}>
              <thead>
                <tr>
                  {["Domain", "Issuer", "Expires", "Days Left", "Status", ""].map((h) => (
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
                {sslLoading && certs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center font-mono text-sm" style={{ opacity: 0.3 }}>
                      Checking certificates…
                    </td>
                  </tr>
                ) : certs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center font-mono text-sm" style={{ opacity: 0.3 }}>
                      No domains added — enter a domain above to monitor its SSL cert
                    </td>
                  </tr>
                ) : (
                  certs.map((cert) => {
                    const s = SSL_STATUS_STYLES[cert.status]
                    return (
                      <tr key={cert.domain}>
                        <td className="px-3 py-2.5" style={{ borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                          <span className="font-mono font-semibold" style={{ color: "#f0f4f8" }}>{cert.domain}</span>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[12px]" style={{ borderBottom: "1px solid var(--border)", opacity: 0.6 }}>
                          {cert.issuer}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[12px]" style={{ borderBottom: "1px solid var(--border)", opacity: 0.6 }}>
                          {cert.validTo}
                        </td>
                        <td className="px-3 py-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
                          <span
                            className="font-mono text-[13px] font-semibold tabular-nums"
                            style={{ color: cert.daysRemaining < 0 ? "#ef4444" : cert.daysRemaining < 14 ? "#f59e0b" : "#8ed8ad" }}
                          >
                            {cert.daysRemaining >= 0 ? `${cert.daysRemaining}d` : cert.error ?? "—"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
                          <span
                            className="rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold"
                            style={{ background: s.bg, color: s.color }}
                          >
                            {s.label}
                          </span>
                        </td>
                        <td className="px-3 py-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
                          <button
                            onClick={() => void removeDomain(cert.domain)}
                            className="font-mono text-[11px] transition-opacity hover:opacity-100"
                            style={{ opacity: 0.35, color: "#ef4444" }}
                          >
                            remove
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="mt-2 font-mono text-[11px]" style={{ opacity: 0.3 }}>
          Certificates refresh every 60s · warning threshold: 14 days
        </div>
      </DashCard>
    </div>
  )
}
