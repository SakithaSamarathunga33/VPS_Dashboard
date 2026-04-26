"use client"

import { useState } from "react"
import Link from "next/link"
import { useSWRConfig } from "swr"

import { AgentErrorBanner } from "@/components/layout/AgentErrorBanner"
import { LogViewer } from "@/components/container/LogViewer"
import { useContainers } from "@/hooks/useContainers"
import { useSystemStats } from "@/hooks/useSystemStats"

export default function LogsPage() {
  const { mutate } = useSWRConfig()
  const { error: sysError, stats, isValidating } = useSystemStats()
  const { containers, error: cError } = useContainers()
  const [selected, setSelected] = useState<string | null>(null)

  const showBanner = Boolean((sysError && !stats) || (cError && !containers))

  const first = containers?.find((c) => c.status === "running") ?? containers?.[0]
  const activeId = selected ?? first?.id ?? null
  const activeContainer = containers?.find((c) => c.id === activeId)

  return (
    <div className="space-y-5">
      {showBanner && (
        <AgentErrorBanner
          isRetrying={isValidating}
          onRetry={() => {
            void mutate("system-stats")
            void mutate("containers")
          }}
        />
      )}

      <h1 className="text-lg font-semibold" style={{ color: "#f0f4f8", letterSpacing: "-0.01em" }}>
        Live Logs
      </h1>

      {/* Container selector */}
      {containers && containers.length > 0 && (
        <div
          className="overflow-hidden rounded-xl"
          style={{ border: "1px solid var(--border)", background: "var(--card)" }}
        >
          {containers.map((c) => {
            const isActive = c.id === activeId
            return (
              <button
                key={c.id}
                onClick={() => setSelected(c.id)}
                className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors"
                style={{
                  borderBottom: "1px solid var(--border)",
                  background: isActive ? "rgba(74,162,171,0.08)" : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"
                }}
                onMouseLeave={(e) => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.background = ""
                }}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="inline-block size-2 shrink-0 rounded-full"
                    style={{ background: c.status === "running" ? "#8ed8ad" : "#6b7280" }}
                  />
                  <div>
                    <div className="font-mono text-[13px] font-semibold" style={{ color: "#f0f4f8" }}>
                      {c.name}
                    </div>
                    <div className="font-mono text-[10px]" style={{ color: "#8899b0" }}>{c.image}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
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
                  <Link
                    href={`/containers/${encodeURIComponent(c.id)}`}
                    onClick={(e) => e.stopPropagation()}
                    className="font-mono text-[10px] transition-opacity hover:opacity-100"
                    style={{ color: "#4aa2ab", opacity: 0.7 }}
                  >
                    Details →
                  </Link>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Log viewer */}
      {activeId ? (
        <div>
          <div className="mb-2 flex items-center gap-2" style={{ fontSize: 13, color: "#8899b0" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
            <span>
              Tailing{" "}
              <span className="font-mono" style={{ color: "#f0f4f8" }}>
                {activeContainer?.name ?? activeId}
              </span>
            </span>
          </div>
          <div
            className="overflow-hidden rounded-xl"
            style={{ border: "1px solid var(--border)", background: "var(--card)" }}
          >
            <LogViewer height={440} containerId={activeId} tail={200} />
          </div>
        </div>
      ) : !containers && !cError ? (
        <p className="text-sm" style={{ color: "#8899b0" }}>Loading…</p>
      ) : (
        <p className="text-sm" style={{ color: "#8899b0" }}>No container available.</p>
      )}
    </div>
  )
}
