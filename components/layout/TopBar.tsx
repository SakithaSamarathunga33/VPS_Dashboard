"use client"

import { useEffect, useState } from "react"
import { Moon, Radio, RefreshCw, Wifi, WifiOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useSystemStats } from "@/hooks/useSystemStats"
import { formatUptime, cn } from "@/lib/utils"

export function TopBar() {
  const { stats, error, isValidating, refresh } = useSystemStats()
  const [now, setNow] = useState(() => new Date())

  const connected = Boolean(stats) && !error
  const hostname = stats?.hostname ?? "—"
  const os = stats?.os ?? "—"
  const uptime = stats?.uptime

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-2 border-b border-vps-border bg-vps-bg/80 px-3 backdrop-blur md:px-4">
      <div className="min-w-0 flex-1">
        <h1
          className="truncate text-sm font-semibold text-vps-text"
          title={hostname}
        >
          {hostname}
        </h1>
        <p className="truncate text-xs text-vps-muted">
          {os}
          {uptime !== undefined ? (
            <> · Up {formatUptime(uptime)}</>
          ) : null}
        </p>
      </div>
      <div className="hidden items-center gap-2 sm:flex">
        <time
          className="font-mono text-sm tabular-nums text-vps-text"
          dateTime={now.toISOString()}
        >
          {now.toLocaleTimeString()}
        </time>
        <div className="hidden items-center text-vps-muted lg:flex" title="Status">
          {connected ? (
            <Wifi className="size-4 text-vps-green" />
          ) : (
            <WifiOff className="size-4 text-vps-red" />
          )}
        </div>
        {isValidating ? (
          <span className="hidden text-[10px] font-medium text-vps-blue lg:inline">
            Syncing
          </span>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => void refresh()}
          title="Refresh now"
        >
          <RefreshCw
            className={cn("size-4", isValidating && "animate-spin text-vps-blue")}
          />
        </Button>
        <div className="hidden items-center gap-1.5 sm:flex" title="Connection">
          <Radio
            className={cn(
              "size-4",
              connected ? "text-vps-green" : "text-vps-red"
            )}
          />
        </div>
        <div
          className="inline-flex size-8 items-center justify-center rounded-lg"
          title="Dark mode (only theme)"
          aria-label="Dark mode"
        >
          <Moon className="size-4 text-vps-muted" />
        </div>
      </div>
    </header>
  )
}
