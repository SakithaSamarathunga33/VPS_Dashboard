"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Download, HardDrive } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ContainerActions } from "@/components/container/ContainerActions"
import { UptimeBlocks } from "@/components/dashboard/UptimeBlocks"
import { StatusBadge } from "@/components/dashboard/StatusBadge"
import { useContainerStats } from "@/hooks/useContainerStats"
import type { Container } from "@/types/docker"
import {
  cn,
  formatBytes,
  formatPercent,
  cpuColor,
} from "@/lib/utils"

function MiniCpuBar({ percent }: { percent: number }) {
  const steps = 8
  const filled = Math.min(steps, Math.max(0, Math.round((percent / 100) * steps)))
  return (
    <div className="flex w-10 gap-px" title={`${formatPercent(percent, 1)} CPU`}>
      {Array.from({ length: steps }, (_, i) => (
        <div
          key={i}
          className={cn(
            "h-1.5 flex-1 rounded-sm",
            i < filled
              ? percent < 60
                ? "bg-vps-green/90"
                : percent < 80
                  ? "bg-vps-yellow/90"
                  : "bg-vps-red/90"
              : "bg-vps-border/80"
          )}
        />
      ))}
    </div>
  )
}

type ContainerCardProps = {
  container: Container
  style?: React.CSSProperties
}

export function ContainerCard({ container, style }: ContainerCardProps) {
  const router = useRouter()
  const { stats, error } = useContainerStats(container.id)
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
    const key = `${p.publicPort}-${p.privatePort}-${p.type}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  const shownPorts = uniquePorts.slice(0, 2)
  const extraPorts = uniquePorts.length - shownPorts.length

  return (
    <div
      style={style}
      className={cn(
        "group flex min-w-0 items-center gap-3 border-b border-vps-border px-4 py-2.5",
        "cursor-pointer",
        "opacity-0 [animation-delay:var(--d)] [animation-fill-mode:forwards] animate-vps-fade-in",
        "transition-colors duration-150",
        "hover:bg-vps-border/20"
      )}
      onClick={handleRowClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          void router.push(href)
        }
      }}
      role="link"
      tabIndex={0}
    >
      {/* Identity */}
      <div className="w-44 min-w-0 shrink-0">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "inline-block size-2 shrink-0 rounded-full",
              status === "running" && "bg-vps-green animate-vps-pulse-glow"
            )}
            style={
              status === "running"
                ? { boxShadow: "0 0 0 0 rgba(63, 185, 80, 0.45)" }
                : { background: "var(--vps-border)" }
            }
            aria-label={status}
          />
          <span
            className="truncate font-mono text-xs font-semibold text-vps-text"
            title={container.name}
          >
            {container.name}
          </span>
        </div>
        <p className="mt-0.5 truncate pl-3.5 font-mono text-[10px] text-vps-muted" title={container.image}>
          {container.image}
        </p>
      </div>

      {/* Status + ports */}
      <div className="flex w-52 shrink-0 flex-wrap items-center gap-1">
        <StatusBadge status={status} />
        {shownPorts.map((p) => (
          <Badge
            key={`${p.publicPort}-${p.privatePort}-${p.type}`}
            variant="outline"
            className="h-5 border-vps-border/80 px-1.5 text-[10px] font-normal text-vps-muted"
          >
            {p.publicPort}-&gt;{p.privatePort}/{p.type}
          </Badge>
        ))}
        {extraPorts > 0 && (
          <Badge variant="outline" className="h-5 border-vps-border/80 px-1.5 text-[10px] font-normal text-vps-muted">
            +{extraPorts}
          </Badge>
        )}
      </div>

      {/* Uptime bar */}
      <div className="min-w-0 flex-1">
        <UptimeBlocks containerId={container.id} />
      </div>

      {/* CPU */}
      <div className="w-20 shrink-0 text-right">
        <p className="text-[10px] text-vps-muted">CPU</p>
        {error || stats === undefined ? (
          <span className="font-mono text-xs text-vps-muted">—</span>
        ) : (
          <div className="flex items-center justify-end gap-1.5">
            <span className={cn("font-mono text-xs tabular-nums", cpuColor(stats.cpu))}>
              {formatPercent(stats.cpu, 1)}
            </span>
            <MiniCpuBar percent={stats.cpu} />
          </div>
        )}
      </div>

      {/* MEM */}
      <div className="w-36 shrink-0 text-right">
        <p className="text-[10px] text-vps-muted">MEM</p>
        {error || stats === undefined ? (
          <span className="font-mono text-xs text-vps-muted">—</span>
        ) : (
          <>
            <p className="font-mono text-xs text-vps-text">
              {formatBytes(stats.memory.usage)}{" "}
              <span className="text-vps-muted">{formatPercent(stats.memory.percent, 0)}</span>
            </p>
            <Progress
              value={stats.memory.percent}
              className="mt-0.5 w-full [&_[data-slot=progress-track]]:h-0.5"
            />
          </>
        )}
      </div>

      {/* NET */}
      <div className="hidden w-36 shrink-0 text-right lg:block">
        <div className="flex items-center justify-end gap-1 text-[10px] text-vps-muted">
          <Download className="size-3" />
          <span>NET</span>
        </div>
        {error || stats === undefined ? (
          <span className="font-mono text-xs text-vps-muted">—</span>
        ) : (
          <span className="font-mono text-xs text-vps-text">
            ↓ {formatBytes(stats.network.rx)} · ↑ {formatBytes(stats.network.tx)}
          </span>
        )}
      </div>

      {/* DISK I/O */}
      <div className="hidden w-28 shrink-0 text-right xl:block">
        <div className="flex items-center justify-end gap-1 text-[10px] text-vps-muted">
          <HardDrive className="size-3" />
          <span>DISK</span>
        </div>
        {error || stats === undefined ? (
          <span className="font-mono text-xs text-vps-muted">—</span>
        ) : (
          <span className="font-mono text-xs text-vps-text">
            R {formatBytes(stats.blockIO.read)} · W {formatBytes(stats.blockIO.write)}
          </span>
        )}
      </div>

      {/* Details link */}
      <div className="hidden shrink-0 sm:block">
        <Link
          className="font-mono text-[10px] text-vps-blue underline-offset-2 hover:underline"
          href={href}
          onClick={(e) => e.stopPropagation()}
        >
          {container.shortId}
        </Link>
      </div>

      {/* Actions */}
      <div
        data-container-actions
        className="shrink-0"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <ContainerActions container={container} onOptimisticStatus={setOpt} />
      </div>
    </div>
  )
}
