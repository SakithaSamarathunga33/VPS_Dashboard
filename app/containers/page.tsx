"use client"

import { useSWRConfig } from "swr"

import { ContainerGrid } from "@/components/dashboard/ContainerGrid"
import { AgentErrorBanner } from "@/components/layout/AgentErrorBanner"
import { useContainers } from "@/hooks/useContainers"
import { useSystemStats } from "@/hooks/useSystemStats"

export default function ContainersPage() {
  const { mutate } = useSWRConfig()
  const { error: sysError, stats, isValidating } = useSystemStats()
  const { error: cError, containers } = useContainers()

  const showBanner = Boolean(
    (sysError && !stats) || (cError && !containers)
  )

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
      <h1 className="text-lg font-semibold text-vps-text">Containers</h1>
      <ContainerGrid />
    </div>
  )
}
