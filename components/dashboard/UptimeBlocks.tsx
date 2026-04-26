"use client"

import { format } from "date-fns"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useUptimeHistory, useUptimeStats } from "@/hooks/useUptimeHistory"
import { cn } from "@/lib/utils"

type UptimeBlocksProps = {
  containerId: string
  className?: string
  mode?: "recent" | "daily"
  days?: number
}

export function UptimeBlocks({
  containerId,
  className,
  mode = "recent",
  days = 30,
}: UptimeBlocksProps) {
  const { history, isLoading: loadingH } = useUptimeHistory(containerId, 90)
  const { uptimePercent, dailyBlocks, isLoading: loadingD } = useUptimeStats(
    containerId,
    days
  )

  const loading = mode === "recent" ? loadingH : loadingD

  if (mode === "recent") {
    return (
      <div
        className={cn(
          "flex min-w-0 items-center gap-2",
          className
        )}
        aria-label="Uptime history"
      >
        <div className="flex h-5 items-end gap-px overflow-hidden" style={{ width: 120 }}>
          {loading && history.length === 0
            ? Array.from({ length: 30 }, (_, i) => (
                <div
                  key={i}
                  className="h-7 w-1.5 shrink-0 animate-pulse rounded-sm bg-vps-border/60"
                />
              ))
            : (history.length ? history : []).map((tick, i) => (
                <Tooltip key={`${i}-${tick.checked_at}`}>
                  <TooltipTrigger
                    className="h-5 w-px shrink-0 cursor-pointer rounded-sm outline-none transition-opacity hover:opacity-80"
                    type="button"
                    style={{
                      minWidth: 2,
                      backgroundColor: tick.is_up ? "#8ed8ad" : "#ef4444",
                    }}
                  />
                  <TooltipContent side="top" className="max-w-xs text-left text-xs">
                    <p>{tick.is_up ? "Up" : "Down"}</p>
                    <p className="text-muted-foreground">
                      {format(
                        new Date(tick.checked_at),
                        "MMM d, HH:mm:ss"
                      )}
                    </p>
                    <p>Status: {tick.status}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
        </div>
        <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
          {uptimePercent.toFixed(1)}%
        </span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-center gap-2",
        className
      )}
      aria-label="Daily uptime"
    >
      <div className="flex h-7 min-w-0 flex-1 items-end gap-0.5 overflow-hidden">
        {loading && dailyBlocks.length === 0
          ? Array.from({ length: 30 }, (_, i) => (
              <div
                key={i}
                className="h-7 w-2 shrink-0 animate-pulse rounded-sm bg-vps-border/60"
              />
            ))
          : dailyBlocks.map((block, i) => (
              <Tooltip key={block.date || i}>
                <TooltipTrigger
                  className="h-7 w-2 shrink-0 cursor-pointer rounded-sm outline-none transition-opacity hover:opacity-80"
                  type="button"
                  style={{
                    backgroundColor:
                      block.uptime_percent >= 99
                        ? "#8ed8ad"
                        : block.uptime_percent >= 90
                          ? "#f59e0b"
                          : "#ef4444",
                  }}
                />
                <TooltipContent side="top" className="max-w-xs text-left text-xs">
                  <p className="font-semibold">{block.date}</p>
                  <p>Uptime: {block.uptime_percent}%</p>
                  <p className="text-muted-foreground">
                    {block.up_count} up / {block.down_count} down checks
                  </p>
                </TooltipContent>
              </Tooltip>
            ))}
      </div>
      <span className="shrink-0 font-mono text-sm tabular-nums text-muted-foreground">
        {uptimePercent.toFixed(2)}% uptime
      </span>
    </div>
  )
}
