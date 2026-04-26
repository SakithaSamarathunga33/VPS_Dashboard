"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { ContainerActions } from "@/components/container/ContainerActions"
import { UptimeBlocks } from "@/components/dashboard/UptimeBlocks"
import { useContainerStats } from "@/hooks/useContainerStats"
import type { Container } from "@/types/docker"
import { cn, formatBytes, formatPercent } from "@/lib/utils"
import { HBar } from "@/components/charts"

function Td({
  children,
  className,
  style,
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <td
      className={cn("px-3 py-2.5", className)}
      style={{ fontSize: 13, borderBottom: "1px solid var(--border)", ...style }}
    >
      {children}
    </td>
  )
}

function StatusDot({ status }: { status: string }) {
  const color = status === "running" ? "#8ed8ad" : "#6b7280"
  return (
    <span
      className={cn(
        "inline-block shrink-0 rounded-full",
        status === "running" && "animate-vps-pulse-glow"
      )}
      style={{
        width: 7,
        height: 7,
        background: color,
      }}
    />
  )
}

type ContainerCardProps = {
  container: Container
  style?: React.CSSProperties
}

export function ContainerCard({ container, style }: ContainerCardProps) {
  const router = useRouter()
  const { stats } = useContainerStats(container.id)
  const [opt, setOpt] = useState<Container["status"] | null>(null)
  const status = opt ?? container.status
  const href = `/containers/${encodeURIComponent(container.id)}`

  const handleRowClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-container-actions]")) return
    if ((e.target as HTMLElement).closest("a")) return
    void router.push(href)
  }

  const seen = new Set<string>()
  const uniquePorts = container.ports.filter((p) => {
    const key = `${p.publicPort}-${p.privatePort}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  const portStr =
    uniquePorts
      .slice(0, 2)
      .map((p) => p.publicPort || p.privatePort)
      .filter(Boolean)
      .join(", ") || "—"

  return (
    <tr
      style={style}
      className={cn(
        "cursor-pointer opacity-0 [animation-delay:var(--d)] [animation-fill-mode:forwards] animate-vps-fade-in",
        "transition-colors duration-100"
      )}
      onClick={handleRowClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.025)"
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = ""
      }}
    >
      {/* Name */}
      <Td>
        <div className="flex items-center gap-2">
          <StatusDot status={status} />
          <div className="min-w-0">
            <div className="font-mono text-[13px] font-semibold" style={{ color: "#f0f4f8" }}>
              {container.name}
            </div>
            <div className="font-mono text-[10px]" style={{ color: "#8899b0" }}>
              {container.image}
            </div>
          </div>
        </div>
      </Td>

      {/* Status */}
      <Td>
        <span
          className="rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold"
          style={
            status === "running"
              ? { background: "rgba(142,216,173,0.12)", color: "#8ed8ad" }
              : { background: "rgba(107,114,128,0.12)", color: "#8899b0" }
          }
        >
          {status}
        </span>
      </Td>

      {/* Uptime blocks — real agent data via useUptimeHistory */}
      <Td className="hidden lg:table-cell" style={{ minWidth: 180 }}>
        {status === "running" ? (
          <UptimeBlocks containerId={container.id} mode="recent" />
        ) : (
          <span className="font-mono text-[11px]" style={{ opacity: 0.35 }}>—</span>
        )}
      </Td>

      {/* CPU */}
      <Td>
        {stats !== undefined ? (
          <div style={{ minWidth: 76 }}>
            <div
              className="mb-1 font-mono text-[11px]"
              style={{ color: stats.cpu > 70 ? "#f59e0b" : "#f0f4f8" }}
            >
              {formatPercent(stats.cpu, 1)}
            </div>
            <HBar value={stats.cpu} max={100} color="#4aa2ab" height={4} />
          </div>
        ) : (
          <span className="font-mono text-xs" style={{ opacity: 0.35 }}>—</span>
        )}
      </Td>

      {/* RAM */}
      <Td>
        {stats !== undefined ? (
          <div style={{ minWidth: 100 }}>
            <div className="mb-1 font-mono text-[11px]" style={{ color: "#f0f4f8" }}>
              {formatBytes(stats.memory.usage)}{" "}
              <span style={{ opacity: 0.45 }}>{formatPercent(stats.memory.percent, 0)}</span>
            </div>
            <HBar value={stats.memory.percent} max={100} color="#8ed8ad" height={4} />
          </div>
        ) : (
          <span className="font-mono text-xs" style={{ opacity: 0.35 }}>—</span>
        )}
      </Td>

      {/* Network RX/TX — real agent data */}
      <Td className="hidden xl:table-cell">
        {stats !== undefined ? (
          <div className="font-mono text-[11px]" style={{ color: "#8899b0" }}>
            <div>↓ {formatBytes(stats.network.rx)}</div>
            <div>↑ {formatBytes(stats.network.tx)}</div>
          </div>
        ) : (
          <span className="font-mono text-xs" style={{ opacity: 0.35 }}>—</span>
        )}
      </Td>

      {/* Disk I/O — real agent data */}
      <Td className="hidden 2xl:table-cell">
        {stats !== undefined ? (
          <div className="font-mono text-[11px]" style={{ color: "#8899b0" }}>
            <div>R {formatBytes(stats.blockIO.read)}</div>
            <div>W {formatBytes(stats.blockIO.write)}</div>
          </div>
        ) : (
          <span className="font-mono text-xs" style={{ opacity: 0.35 }}>—</span>
        )}
      </Td>

      {/* Ports */}
      <Td>
        <span className="font-mono text-[11px]" style={{ opacity: 0.5 }}>
          {portStr}
        </span>
      </Td>

      {/* Actions */}
      <Td>
        <div
          data-container-actions
          className="flex items-center justify-end gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <Link
            href={href}
            className="font-mono text-[10px] transition-opacity hover:opacity-100"
            style={{ color: "#4aa2ab", opacity: 0.6 }}
            onClick={(e) => e.stopPropagation()}
          >
            {container.shortId}
          </Link>
          <ContainerActions container={container} onOptimisticStatus={setOpt} />
        </div>
      </Td>
    </tr>
  )
}
