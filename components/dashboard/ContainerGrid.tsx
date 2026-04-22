"use client"

import { Box, PackageOpen } from "lucide-react"

import { useContainers } from "@/hooks/useContainers"
import { ContainerCard } from "@/components/dashboard/ContainerCard"
import { Skeleton } from "@/components/ui/skeleton"

export function ContainerGrid() {
  const { containers, isLoading, error } = useContainers()

  if (isLoading && !containers) {
    return (
      <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-vps-border bg-vps-card p-4"
          >
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="mt-2 h-3 w-1/2" />
            <Skeleton className="mt-4 h-10 w-full" />
          </div>
        ))}
      </div>
    )
  }

  if (error && !containers) {
    return null
  }

  if (!containers?.length) {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-vps-border bg-vps-card/40 px-4 py-12 text-center">
        <div className="mb-2 inline-flex size-10 items-center justify-center rounded-full bg-vps-border/50">
          <Box className="size-5 text-vps-muted" />
        </div>
        <p className="text-sm font-medium text-vps-text">No containers found</p>
        <p className="mt-1 max-w-sm text-xs text-vps-muted">
          When your agent reports Docker containers, they will show up here as
          Uptime Kuma–style monitor cards.
        </p>
        <div className="mt-4 text-vps-muted" aria-hidden>
          <PackageOpen className="mx-auto size-8 opacity-40" />
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
      {containers.map((c, i) => (
        <ContainerCard
          key={c.id}
          container={c}
          style={{ "--d": `${i * 50}ms` } as React.CSSProperties}
        />
      ))}
    </div>
  )
}
