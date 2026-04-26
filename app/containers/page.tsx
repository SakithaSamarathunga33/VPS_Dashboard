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

  const showBanner = Boolean((sysError && !stats) || (cError && !containers))

  return (
    <div className="space-y-5">
      {showBanner && (
        <AgentErrorBanner
          isRetrying={isValidating}
          onRetry={() => {
            void mutate("system-stats")
            void mutate("containers")
          }}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold" style={{ color: "#f0f4f8", letterSpacing: "-0.01em" }}>
            Docker Containers
          </h1>
          <p className="text-sm" style={{ color: "#8899b0", marginTop: 2 }}>
            {containers
              ? `${containers.filter((c) => c.status === "running").length} running · ${containers.length} total`
              : "Loading…"}
          </p>
        </div>
      </div>

      <ContainerGrid />
    </div>
  )
}
