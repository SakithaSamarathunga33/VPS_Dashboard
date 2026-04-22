"use client"

import Link from "next/link"
import { ScrollText } from "lucide-react"

import { AgentErrorBanner } from "@/components/layout/AgentErrorBanner"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { LogViewer } from "@/components/container/LogViewer"
import { useContainers } from "@/hooks/useContainers"
import { useSystemStats } from "@/hooks/useSystemStats"
import { useSWRConfig } from "swr"

export default function LogsPage() {
  const { mutate } = useSWRConfig()
  const { error: sysError, stats, isValidating } = useSystemStats()
  const { containers, error: cError } = useContainers()

  const showBanner = Boolean(
    (sysError && !stats) || (cError && !containers)
  )

  const first =
    containers?.find((c) => c.status === "running") ?? containers?.[0]

  return (
    <div className="space-y-4">
      {showBanner && (
        <AgentErrorBanner
          isRetrying={isValidating}
          onRetry={() => {
            void mutate("system-stats")
            void mutate("containers")
          }}
        />
      )}
      <div>
        <h1 className="text-lg font-semibold text-vps-text">Logs</h1>
        <p className="text-sm text-vps-muted">
          Open full container detail for tabs and historical charts. This page
          can tail the first running container (if any) as a quick view.
        </p>
      </div>
      <div className="space-y-2">
        {containers?.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-vps-border bg-vps-card/60 px-2 py-1.5"
          >
            <div className="min-w-0">
              <p className="truncate font-mono text-sm text-vps-text">{c.name}</p>
              <p className="truncate text-xs text-vps-muted">{c.image}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Badge variant="outline" className="text-[10px]">
                {c.status}
              </Badge>
              <Link
                className={buttonVariants({
                  variant: "secondary",
                  size: "sm",
                  className: "h-7 text-xs",
                })}
                href={`/containers/${encodeURIComponent(c.id)}`}
              >
                Details
              </Link>
            </div>
          </div>
        ))}
      </div>
      {first ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-vps-text">
            <ScrollText className="size-4" />
            Live tail: <span className="font-mono text-xs">{first.name}</span>
          </div>
          <div className="rounded-xl border border-vps-border bg-vps-bg/40 p-2">
            <LogViewer height={200} containerId={first.id} tail={100} />
          </div>
        </div>
      ) : !containers && !cError ? (
        <p className="text-sm text-vps-muted">Loading…</p>
      ) : (
        <p className="text-sm text-vps-muted">No container available for a quick tail.</p>
      )}
    </div>
  )
}
