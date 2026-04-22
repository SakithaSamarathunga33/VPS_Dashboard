"use client"

import { Box, PackageOpen } from "lucide-react"

import { useContainers } from "@/hooks/useContainers"
import { ContainerCard } from "@/components/dashboard/ContainerCard"
import { Skeleton } from "@/components/ui/skeleton"

function HeaderRow() {
  return (
    <div className="flex min-w-0 items-center gap-3 border-b border-vps-border px-4 py-1.5">
      <span className="w-44 shrink-0 text-[10px] font-medium uppercase tracking-wide text-vps-muted">
        Container
      </span>
      <span className="w-52 shrink-0 text-[10px] font-medium uppercase tracking-wide text-vps-muted">
        Status
      </span>
      <span className="min-w-0 flex-1 text-[10px] font-medium uppercase tracking-wide text-vps-muted">
        Uptime
      </span>
      <span className="w-20 shrink-0 text-right text-[10px] font-medium uppercase tracking-wide text-vps-muted">
        CPU
      </span>
      <span className="w-36 shrink-0 text-right text-[10px] font-medium uppercase tracking-wide text-vps-muted">
        Memory
      </span>
      <span className="hidden w-36 shrink-0 text-right text-[10px] font-medium uppercase tracking-wide text-vps-muted lg:block">
        Network
      </span>
      <span className="hidden w-28 shrink-0 text-right text-[10px] font-medium uppercase tracking-wide text-vps-muted xl:block">
        Disk I/O
      </span>
      <span className="hidden w-16 shrink-0 sm:block" />
      <span className="w-20 shrink-0" />
    </div>
  )
}

export function ContainerGrid() {
  const { containers, isLoading, error } = useContainers()

  if (isLoading && !containers) {
    return (
      <div className="overflow-hidden rounded-xl border border-vps-border bg-vps-card">
        <HeaderRow />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-vps-border px-4 py-3 last:border-0">
            <Skeleton className="h-3 w-44" />
            <Skeleton className="h-3 w-52" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-36" />
          </div>
        ))}
      </div>
    )
  }

  if (error && !containers) return null

  if (!containers?.length) {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-vps-border bg-vps-card/40 px-4 py-12 text-center">
        <div className="mb-2 inline-flex size-10 items-center justify-center rounded-full bg-vps-border/50">
          <Box className="size-5 text-vps-muted" />
        </div>
        <p className="text-sm font-medium text-vps-text">No containers found</p>
        <p className="mt-1 max-w-sm text-xs text-vps-muted">
          When your agent reports Docker containers, they will show up here.
        </p>
        <div className="mt-4 text-vps-muted" aria-hidden>
          <PackageOpen className="mx-auto size-8 opacity-40" />
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-vps-border bg-vps-card">
      <HeaderRow />
      {containers.map((c, i) => (
        <ContainerCard
          key={c.id}
          container={c}
          style={{ "--d": `${i * 40}ms` } as React.CSSProperties}
        />
      ))}
    </div>
  )
}
