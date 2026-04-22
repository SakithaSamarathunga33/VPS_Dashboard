"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Download, HardDrive } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
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
  const steps = 10
  const filled = Math.min(
    steps,
    Math.max(0, Math.round((percent / 100) * steps))
  )
  return (
    <div
      className="flex w-[52px] gap-px"
      title={`${formatPercent(percent, 1)} CPU`}
    >
      {Array.from({ length: steps }, (_, i) => (
        <div
          key={i}
          className={cn(
            "h-2 flex-1 rounded-sm",
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

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-container-actions]")) return
    void router.push(href)
  }

  return (
    <Card
      style={style}
      className={cn(
        "group relative border-vps-border bg-vps-card",
        "cursor-pointer",
        "opacity-0 [animation-delay:var(--d)] [animation-fill-mode:forwards] animate-vps-fade-in",
        "transition-all duration-200",
        "hover:-translate-y-px hover:border-vps-green/30 hover:shadow-sm"
      )}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          void router.push(href)
        }
      }}
      role="link"
      tabIndex={0}
    >
      <div
        data-container-actions
        className="absolute top-2 right-2 z-10 flex items-center gap-0.5"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <ContainerActions
          container={container}
          onOptimisticStatus={setOpt}
        />
      </div>
      <CardContent className="space-y-2 pt-3 pr-14">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "mt-0.5 inline-block size-2.5 rounded-full",
                  status === "running" && "bg-vps-green animate-vps-pulse-glow"
                )}
                style={
                  status === "running"
                    ? { boxShadow: "0 0 0 0 rgba(63, 185, 80, 0.45)" }
                    : { background: "var(--vps-border)" }
                }
                aria-label={status}
              />
              <h3
                className="truncate font-mono text-sm font-semibold text-vps-text"
                title={container.name}
              >
                {container.name}
              </h3>
            </div>
            <p
              className="mt-0.5 font-mono text-xs text-vps-muted"
              title={container.image}
            >
              {container.image}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-1">
              <StatusBadge status={status} />
              {container.ports.slice(0, 3).map((p) => (
                <Badge
                  key={`${p.publicPort}-${p.privatePort}`}
                  variant="outline"
                  className="h-5 border-vps-border/80 px-1.5 text-[10px] font-normal text-vps-muted"
                >
                  {p.ip && p.ip !== "0.0.0.0" ? `${p.ip}:` : "0.0.0.0:"}
                  {p.publicPort}-&gt;{p.privatePort}/{p.type}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-end justify-between gap-2">
            <UptimeBlocks
              className="min-w-0 flex-1"
              containerId={container.id}
            />
            <span className="shrink-0 font-mono text-xs text-vps-muted">
              {formatPercent(container.uptimePercent, 1)} uptime
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-1.5 text-[11px] sm:grid-cols-2">
          <div className="flex items-center justify-between gap-1">
            <span className="text-vps-muted">CPU</span>
            <div className="flex items-center gap-1.5">
              {error || stats === undefined ? (
                <Tooltip>
                  <TooltipTrigger className="font-mono text-vps-muted" type="button">
                    —
                  </TooltipTrigger>
                  <TooltipContent>Stats not available (agent or container offline)</TooltipContent>
                </Tooltip>
              ) : (
                <span
                  className={cn(
                    "font-mono tabular-nums",
                    cpuColor(stats.cpu)
                  )}
                >
                  {formatPercent(stats.cpu, 1)}
                </span>
              )}
              {stats && !error ? <MiniCpuBar percent={stats.cpu} /> : null}
            </div>
          </div>
          <div className="flex items-center justify-between gap-1">
            <span className="text-vps-muted">MEM</span>
            {error || stats === undefined ? (
              <Tooltip>
                <TooltipTrigger className="font-mono text-vps-muted" type="button">
                  —
                </TooltipTrigger>
                <TooltipContent>Stats not available (agent or container offline)</TooltipContent>
              </Tooltip>
            ) : (
              <div className="min-w-0 text-right">
                <p className="font-mono text-vps-text">
                  {formatBytes(stats.memory.usage)} / {formatBytes(stats.memory.limit)}{" "}
                  <span className="text-vps-muted">
                    {formatPercent(stats.memory.percent, 0)}
                  </span>
                </p>
                <div className="mt-0.5">
                  <Progress
                    value={stats.memory.percent}
                    className="w-full [&_[data-slot=progress-track]]:h-1"
                  />
                </div>
              </div>
            )}
          </div>
          <div className="col-span-1 flex items-center justify-between gap-1 sm:col-span-2">
            <div className="flex items-center gap-1 text-vps-muted">
              <span>NET</span>
              <Download className="size-3" />
            </div>
            {error || stats === undefined ? (
              <span className="font-mono text-vps-muted">—</span>
            ) : (
              <span className="font-mono text-vps-text">
                ↓ {formatBytes(stats.network.rx)} · ↑ {formatBytes(stats.network.tx)}
              </span>
            )}
          </div>
          <div className="col-span-1 flex items-center justify-between gap-1 sm:col-span-2">
            <div className="flex items-center gap-1 text-vps-muted">
              <span>DISK I/O</span>
              <HardDrive className="size-3" />
            </div>
            {error || stats === undefined ? (
              <span className="font-mono text-vps-muted">—</span>
            ) : (
              <span className="font-mono text-vps-text">
                R {formatBytes(stats.blockIO.read)} · W {formatBytes(
                  stats.blockIO.write
                )}
              </span>
            )}
          </div>
        </div>
        <p className="pt-0.5 text-[10px] text-vps-muted/80">
          Open details:{" "}
          <Link
            className="text-vps-blue underline-offset-2 hover:underline"
            href={href}
            onClick={(e) => e.stopPropagation()}
          >
            {container.shortId}
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
