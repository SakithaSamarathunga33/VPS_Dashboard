import { Loader2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Container } from "@/types/docker"

type StatusBadgeProps = {
  status: Container["status"]
  className?: string
}

const labels: Record<Container["status"], string> = {
  running: "Running",
  exited: "Stopped",
  paused: "Paused",
  restarting: "Restarting",
  dead: "Dead",
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge
      className={cn(
        "shrink-0 border font-medium",
        status === "running" &&
          "border-vps-green/40 bg-vps-green/15 text-vps-green",
        status === "exited" && "border-vps-red/40 bg-vps-red/15 text-vps-red",
        status === "paused" && "border-vps-yellow/40 bg-vps-yellow/20 text-vps-yellow",
        status === "restarting" &&
          "border-vps-blue/40 bg-vps-blue/15 text-vps-blue",
        status === "dead" && "border-vps-border bg-vps-border/40 text-vps-muted",
        className
      )}
    >
      {status === "restarting" && (
        <Loader2
          className="mr-1 inline size-3 animate-spin"
          aria-hidden
        />
      )}
      {labels[status]}
    </Badge>
  )
}
