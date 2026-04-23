"use client"

import { AlertTriangle, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
type AgentErrorBannerProps = {
  onRetry: () => void
  isRetrying?: boolean
}

export function AgentErrorBanner({
  onRetry,
  isRetrying,
}: AgentErrorBannerProps) {
  return (
    <div
      className="flex flex-col gap-3 border-b border-vps-border bg-vps-red/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      role="alert"
    >
      <div className="flex items-start gap-2 text-sm text-vps-text">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-vps-yellow" />
        <div>
          <p className="font-medium">Cannot connect to VPS agent</p>
          <p className="mt-1 break-all font-mono text-xs text-vps-muted">
            /api
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0 border-vps-border"
        onClick={() => onRetry()}
        disabled={isRetrying}
      >
        <RefreshCw
          className={`mr-2 size-4 ${isRetrying ? "animate-spin" : ""}`}
        />
        Retry
      </Button>
    </div>
  )
}
