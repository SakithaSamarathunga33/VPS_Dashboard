"use client"

import { useEffect, useState } from "react"
import { Moon, Radio, RefreshCw, Wifi, WifiOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useSystemStats } from "@/hooks/useSystemStats"
import { formatUptime, cn } from "@/lib/utils"

function RefreshRing({ seconds, total }: { seconds: number; total: number }) {
  const p = Math.max(0, Math.min(100, (seconds / total) * 100))
  return (
    <div
      className="relative size-8"
      title={`Next auto-refresh in ${seconds}s`}
      role="img"
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-mono text-[10px] text-vps-muted tabular-nums">
          {seconds}
        </span>
      </div>
      <svg
        className="size-8 -rotate-90"
        viewBox="0 0 36 36"
        aria-hidden
      >
        <path
          d="M18 2.0845
            a 15.9155 15.9155 0 0 1 0 31.831
            a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-vps-border"
        />
        <path
          d="M18 2.0845
            a 15.9155 15.9155 0 0 1 0 31.831
            a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray={`${p}, 100`}
          className="text-vps-green"
        />
      </svg>
    </div>
  )
}

export function TopBar() {
  const { stats, error, isValidating, refresh } = useSystemStats()
  const [now, setNow] = useState(() => new Date())
  const [countdown, setCountdown] = useState(5)

  const connected = Boolean(stats) && !error
  const hostname = stats?.hostname ?? "—"
  const os = stats?.os ?? "—"
  const uptime = stats?.uptime

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (stats) setCountdown(5)
  }, [stats])

  useEffect(() => {
    const id = setInterval(() => {
      setCountdown((c) => (c <= 1 ? 5 : c - 1))
    }, 1000)
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
        <div className="hidden items-center gap-1 lg:flex" aria-label="Next refresh">
          <RefreshRing seconds={countdown} total={5} />
        </div>
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
        <DropdownMenu>
          <DropdownMenuTrigger
            className="inline-flex size-8 items-center justify-center rounded-lg hover:bg-vps-border/50"
            title="Theme"
          >
            <Moon className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Appearance</DropdownMenuLabel>
            <DropdownMenuItem disabled>Dark (default)</DropdownMenuItem>
            <p className="px-2 pb-1 text-xs text-vps-muted">
              This dashboard is optimized for a single dark theme.
            </p>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
