"use client"

import { useEffect, useMemo, useState } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useSystemStats } from "@/hooks/useSystemStats"
import {
  cn,
  cpuColor,
  formatBytes,
  formatPercent,
} from "@/lib/utils"

import { StatSparkline } from "./StatSparkline"
import { Skeleton } from "@/components/ui/skeleton"

function barTone(percent: number) {
  if (percent < 60) return "[&_[data-slot=progress-indicator]]:!bg-vps-green"
  if (percent < 80) return "[&_[data-slot=progress-indicator]]:!bg-vps-yellow"
  return "[&_[data-slot=progress-indicator]]:!bg-vps-red"
}

type HistoryPoint = { i: number; v: number }

export function SystemOverview() {
  const { stats, isLoading, error } = useSystemStats()
  const [cpuH, setCpuH] = useState<HistoryPoint[]>([])
  const [memH, setMemH] = useState<HistoryPoint[]>([])
  const [diskH, setDiskH] = useState<HistoryPoint[]>([])

  useEffect(() => {
    if (!stats) return
    setCpuH((h) => [...h, { i: h.length, v: stats.cpu.usagePercent }].slice(-20))
    setMemH((h) => [
      ...h,
      { i: h.length, v: stats.memory.usagePercent },
    ].slice(-20))
    setDiskH((h) => [
      ...h,
      { i: h.length, v: stats.disk.usagePercent },
    ].slice(-20))
  }, [stats])

  if (isLoading && !stats) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="border-vps-border bg-vps-card">
            <CardHeader>
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error && !stats) {
    return null
  }

  if (!stats) {
    return null
  }

  const cards = useMemo(
    () => [
      {
        key: "cpu",
        title: "CPU",
        value: formatPercent(stats.cpu.usagePercent, 1),
        sub: `${stats.cpu.cores} cores · ${stats.cpu.model}`,
        percent: stats.cpu.usagePercent,
        history: cpuH,
        color: "#58a6ff",
        hint: "Host CPU",
      },
      {
        key: "mem",
        title: "Memory",
        value: formatPercent(stats.memory.usagePercent, 1),
        sub: `${formatBytes(stats.memory.used)} / ${formatBytes(stats.memory.total)}`,
        percent: stats.memory.usagePercent,
        history: memH,
        color: "#3fb950",
        hint: "System RAM",
      },
      {
        key: "disk",
        title: "Disk",
        value: formatPercent(stats.disk.usagePercent, 1),
        sub: `${formatBytes(stats.disk.used)} / ${formatBytes(stats.disk.total)} · free ${formatBytes(stats.disk.free)}`,
        percent: stats.disk.usagePercent,
        history: diskH,
        color: "#d29922",
        hint: "Root filesystem",
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stats.cpu.usagePercent, stats.memory.usagePercent, stats.disk.usagePercent, cpuH, memH, diskH]
  )

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {cards.map((c, i) => (
        <Card
          key={c.key}
          className={cn(
            "border-vps-border bg-vps-card",
            "opacity-0 [animation-delay:var(--d)] [animation-fill-mode:forwards] animate-vps-fade-in"
          )}
          style={{ "--d": `${i * 50}ms` } as React.CSSProperties}
        >
          <CardHeader>
            <CardDescription>{c.hint}</CardDescription>
            <CardTitle className="text-sm font-medium text-vps-muted">
              {c.title}
            </CardTitle>
            <div
              className={cn(
                "pt-1 font-mono text-3xl font-semibold tabular-nums",
                cpuColor(c.percent)
              )}
            >
              {c.value}
            </div>
            <p className="text-xs text-vps-muted line-clamp-2" title={c.sub}>
              {c.sub}
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            <Progress
              value={c.percent}
              className={cn(
                "w-full",
                barTone(c.percent),
                "[&_[data-slot=progress-track]]:h-1.5 [&_[data-slot=progress-indicator]]:transition-all [&_[data-slot=progress-indicator]]:duration-500"
              )}
            />
            <StatSparkline data={c.history} color={c.color} />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
