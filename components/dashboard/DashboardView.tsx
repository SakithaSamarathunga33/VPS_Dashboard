"use client"

import { useSWRConfig } from "swr"

import { AgentErrorBanner } from "@/components/layout/AgentErrorBanner"
import { ContainerGrid } from "@/components/dashboard/ContainerGrid"
import { SystemOverview } from "@/components/dashboard/SystemOverview"
import { useContainers } from "@/hooks/useContainers"
import { useSystemStats } from "@/hooks/useSystemStats"

export function DashboardView() {
  const { mutate } = useSWRConfig()
  const { error: sysError, isValidating, stats } = useSystemStats()
  const { error: cError, containers } = useContainers()

  const showBanner = Boolean(
    (sysError && !stats) || (cError && !containers)
  )

  function retry() {
    void mutate("system-stats")
    void mutate("containers")
  }

  return (
    <div className="space-y-4">
      {showBanner && (
        <AgentErrorBanner
          isRetrying={isValidating}
          onRetry={retry}
        />
      )}
      <SystemOverview />
      <div>
        <h2 className="mb-2 text-sm font-semibold text-vps-text">
          Containers
        </h2>
        <ContainerGrid />
      </div>
    </div>
  )
}
