"use client"

import { useSystemStats } from "@/hooks/useSystemStats"
import { formatBytes, formatUptime } from "@/lib/utils"

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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex justify-between py-2.5"
      style={{ borderBottom: "1px solid var(--border)", fontSize: 13 }}
    >
      <span style={{ opacity: 0.5 }}>{label}</span>
      <span className="font-mono text-[12px]" style={{ color: "#f0f4f8" }}>{value}</span>
    </div>
  )
}

export default function SettingsPage() {
  const { stats, error } = useSystemStats()
  const connected = Boolean(stats) && !error

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* Server info */}
        <DashCard>
          <Label>Server Information</Label>
          <div className="mt-3">
            {stats ? (
              <>
                <InfoRow label="Hostname" value={stats.hostname} />
                <InfoRow label="OS" value={stats.os} />
                <InfoRow label="CPU" value={`${stats.cpu.model} · ${stats.cpu.cores} cores`} />
                <InfoRow label="RAM" value={formatBytes(stats.memory.total)} />
                <InfoRow label="Disk" value={formatBytes(stats.disk.total)} />
                <InfoRow label="Uptime" value={formatUptime(stats.uptime)} />
              </>
            ) : (
              <>
                {["Hostname", "OS", "CPU", "RAM", "Disk", "Uptime"].map((k) => (
                  <InfoRow key={k} label={k} value="—" />
                ))}
              </>
            )}
          </div>
        </DashCard>

        <div className="space-y-5">
          {/* Connection status */}
          <DashCard>
            <Label>Agent Status</Label>
            <div className="mt-4 flex items-center gap-3">
              <div
                className="size-3 rounded-full"
                style={{
                  background: connected ? "#8ed8ad" : "#6b7280",
                  boxShadow: connected ? "0 0 8px #8ed8ad80" : "none",
                }}
              />
              <div>
                <div className="font-semibold" style={{ fontSize: 14, color: "#f0f4f8" }}>
                  {connected ? "Agent Connected" : "Agent Offline"}
                </div>
                <div className="font-mono text-[11px]" style={{ color: "#8899b0", marginTop: 2 }}>
                  {connected ? "Real-time data streaming" : "Check agent connectivity"}
                </div>
              </div>
            </div>
          </DashCard>

          {/* About */}
          <DashCard>
            <Label>About</Label>
            <div className="mt-3 space-y-0">
              <InfoRow label="Version" value="1.0.0" />
              <InfoRow label="Framework" value="Next.js 14" />
              <InfoRow label="Monitoring" value="Docker + System" />
              <InfoRow label="Theme" value="Dark (editorial)" />
            </div>
          </DashCard>
        </div>
      </div>
    </div>
  )
}
