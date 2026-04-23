"use client"

import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Loader2 } from "lucide-react"
import { useSWRConfig } from "swr"
import { useEffect, useState } from "react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatsPanel } from "@/components/container/StatsPanel"
import { AgentErrorBanner } from "@/components/layout/AgentErrorBanner"
import { useUptimeStats } from "@/hooks/useUptimeHistory"
import type { Container } from "@/types/docker"

async function fetchContainers(): Promise<Container[]> {
  const res = await fetch("/api/containers", { cache: "no-store" })
  if (!res.ok) throw new Error(`Failed to fetch containers: ${res.status}`)
  return res.json() as Promise<Container[]>
}

function IncidentsList({ containerId }: { containerId: string }) {
  const { incidents, isLoading } = useUptimeStats(containerId, 30)

  if (isLoading) {
    return (
      <p className="py-4 text-sm text-muted-foreground">Loading incidents…</p>
    )
  }

  if (incidents.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-vps-border py-8 text-center text-sm text-muted-foreground">
        No incidents in the last 30 days
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {incidents.map((incident, i) => (
        <div
          key={`${incident.start}-${i}`}
          className="flex items-center justify-between gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3"
        >
          <div className="flex items-center gap-2">
            <div
              className="size-2 shrink-0 rounded-full bg-red-500"
              aria-hidden
            />
            <span className="text-sm font-medium">Downtime</span>
          </div>
          <div className="min-w-0 text-right text-xs font-mono text-muted-foreground">
            {format(new Date(incident.start), "MMM d, HH:mm")}
            {" → "}
            {incident.end ? (
              format(new Date(incident.end), "MMM d, HH:mm")
            ) : (
              <span className="text-vps-red">Ongoing</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function ContainerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { mutate } = useSWRConfig()
  const raw = params.id
  const id = Array.isArray(raw) ? raw[0] : raw
  const decoded = id ? decodeURIComponent(id) : ""

  const [c, setC] = useState<Container | null | "loading">("loading")

  useEffect(() => {
    let active = true
    ;(async () => {
      if (!decoded) {
        setC(null)
        return
      }
      try {
        const all = await fetchContainers()
        if (!active) return
        const found = all.find((x) => x.id === decoded) ?? null
        setC(found)
      } catch {
        if (!active) return
        setC(null)
      }
    })()
    return () => {
      active = false
    }
  }, [decoded])

  if (c === "loading") {
    return (
      <div className="flex min-h-40 items-center justify-center text-vps-muted">
        <Loader2 className="size-5 animate-spin" />
      </div>
    )
  }

  if (!c) {
    return (
      <div className="space-y-3">
        <AgentErrorBanner
          isRetrying={false}
          onRetry={() => {
            void router.refresh()
            void mutate("containers")
          }}
        />
        <p className="text-sm text-vps-muted">
          Container not found, or the agent is unreachable. Try the dashboard
          to verify connectivity and container IDs.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/dashboard")}
        >
          <ArrowLeft className="mr-1 size-4" />
          Back
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
        >
          <ArrowLeft className="size-4" />
          <span>Back</span>
        </Button>
      </div>
      <Card className="border-vps-border bg-vps-card">
        <CardHeader>
          <CardTitle className="text-base">Incidents (30d)</CardTitle>
        </CardHeader>
        <CardContent>
          <IncidentsList containerId={c.id} />
        </CardContent>
      </Card>
      <StatsPanel containerId={c.id} containerName={c.name} />
    </div>
  )
}
