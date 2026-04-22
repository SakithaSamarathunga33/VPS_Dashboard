"use client"

import { useState } from "react"
import { Loader2, Play, RotateCcw, Square } from "lucide-react"
import { useSWRConfig } from "swr"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  restartContainer,
  startContainer,
  stopContainer,
} from "@/lib/agent"
import type { Container } from "@/types/docker"
import { cn } from "@/lib/utils"

type Action = "start" | "stop" | "restart"

type ContainerActionsProps = {
  container: Container
  onOptimisticStatus?: (status: Container["status"]) => void
  size?: "icon" | "icon-sm"
  className?: string
  stopEvent?: (e: React.SyntheticEvent) => void
}

function nextStatus(
  after: Action,
  current: Container["status"]
): Container["status"] {
  if (after === "start") return "running"
  if (after === "stop")
    return current === "restarting" ? "exited" : "exited"
  return "restarting"
}

export function ContainerActions({
  container,
  onOptimisticStatus,
  size = "icon-sm",
  className,
  stopEvent,
}: ContainerActionsProps) {
  const { mutate } = useSWRConfig()
  const [pending, setPending] = useState<Action | null>(null)
  const [confirm, setConfirm] = useState<{ action: Action } | null>(null)

  async function runAction(action: Action) {
    setPending(action)
    const prev = container.status
    const optimistic = nextStatus(action, container.status)
    onOptimisticStatus?.(optimistic)
    void mutate(
      "containers",
      (current: Container[] | undefined) => {
        if (!current) return current
        return current.map((c) =>
          c.id === container.id
            ? { ...c, status: optimistic, state: optimistic }
            : c
        )
      },
      { revalidate: false }
    )
    try {
      if (action === "start") await startContainer(container.id)
      if (action === "stop") await stopContainer(container.id)
      if (action === "restart") await restartContainer(container.id)
      toast.success(
        `Container “${container.name}” ${
          action === "start"
            ? "started"
            : action === "stop"
              ? "stopped"
              : "restarted"
        }`
      )
      void mutate("containers")
      void mutate(["container-stats", container.id])
    } catch (e) {
      onOptimisticStatus?.(prev)
      void mutate("containers")
      toast.error(
        e instanceof Error ? e.message : "Action failed. Check the agent."
      )
    } finally {
      setPending(null)
      setConfirm(null)
    }
  }

  return (
    <>
      <div
        className={cn("flex items-center gap-0.5", className)}
        onClick={stopEvent}
        role="group"
        aria-label="Container actions"
      >
        <Button
          type="button"
          variant="ghost"
          size={size}
          className="text-vps-muted hover:text-vps-text"
          title="Restart"
          disabled={pending !== null}
          onClick={() => setConfirm({ action: "restart" })}
        >
          {pending === "restart" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RotateCcw className="size-3.5" />
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size={size}
          className="text-vps-muted hover:text-vps-red"
          title="Stop"
          disabled={pending !== null}
          onClick={() => setConfirm({ action: "stop" })}
        >
          {pending === "stop" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Square className="size-3.5" />
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size={size}
          className="text-vps-muted hover:text-vps-green"
          title="Start"
          disabled={pending !== null}
          onClick={() => setConfirm({ action: "start" })}
        >
          {pending === "start" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Play className="size-3.5" />
          )}
        </Button>
      </div>
      <AlertDialog
        open={Boolean(confirm)}
        onOpenChange={(v: boolean) => {
          if (!v) setConfirm(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm {confirm?.action}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.action === "start" &&
                `Start “${container.name}”? It will be attached to the default network and started.`}
              {confirm?.action === "stop" &&
                `Stop “${container.name}”? In-flight work may be interrupted.`}
              {confirm?.action === "restart" &&
                `Restart “${container.name}”? The container will be recreated if needed.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirm && void runAction(confirm.action)}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
