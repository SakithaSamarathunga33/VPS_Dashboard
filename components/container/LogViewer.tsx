"use client"

import { useCallback, useMemo, useState } from "react"
import { Copy, Download, Pin, PinOff, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useContainerLogs, useAutoScrollLogs } from "@/hooks/useContainerLogs"
import { cn } from "@/lib/utils"

type LogLevel = "error" | "warn" | "info" | "debug" | "default"

function levelForLine(line: string): LogLevel {
  if (/\b(ERROR|FATAL|CRITICAL)\b/i.test(line)) return "error"
  if (/\bWARN(ING)?\b/i.test(line)) return "warn"
  if (/\bINFO\b/i.test(line)) return "info"
  if (/\bDEBUG\b/i.test(line)) return "debug"
  return "default"
}

const levelClass: Record<LogLevel, string> = {
  error: "text-vps-red",
  warn: "text-vps-yellow",
  info: "text-vps-blue",
  debug: "text-vps-muted",
  default: "text-vps-text",
}

type LogViewerProps = {
  containerId: string
  height?: number
  tail?: number
}

export function LogViewer({ containerId, height = 400, tail = 200 }: LogViewerProps) {
  const { lines, isLoading, isValidating, error, refresh } = useContainerLogs(
    containerId,
    { tail, refreshInterval: 8000 }
  )
  const [query, setQuery] = useState("")
  const [autoScroll, setAutoScroll] = useState(true)
  const [root, setRoot] = useState<HTMLDivElement | null>(null)

  const scrollToBottom = useCallback(() => {
    const v = root?.querySelector<HTMLDivElement>(
      "[data-slot=scroll-area-viewport]"
    )
    if (v) v.scrollTop = v.scrollHeight
  }, [root])

  useAutoScrollLogs(autoScroll, lines, scrollToBottom)

  const filtered = useMemo(() => {
    if (!lines) return undefined
    const q = query.trim().toLowerCase()
    if (!q) return lines
    return lines.filter((l) => l.toLowerCase().includes(q))
  }, [lines, query])

  function copyAll() {
    if (!lines?.length) return
    const text = lines.join("\n")
    void navigator.clipboard.writeText(text)
  }

  function download() {
    if (!lines?.length) return
    const text = lines.join("\n")
    const blob = new Blob([text], { type: "text/plain" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `logs-${containerId.slice(0, 12)}.txt`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          placeholder="Search logs…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="font-mono text-xs border-vps-border"
        />
        <div className="flex flex-wrap items-center justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            title={autoScroll ? "Auto-scroll on" : "Auto-scroll off"}
            onClick={() => setAutoScroll((v) => !v)}
            className={autoScroll ? "text-vps-green" : "text-vps-muted"}
          >
            {autoScroll ? (
              <Pin className="size-4" />
            ) : (
              <PinOff className="size-4" />
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={copyAll}
            title="Copy all"
          >
            <Copy className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={download}
            title="Download"
          >
            <Download className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => void refresh()}
            title="Refresh"
            disabled={isValidating}
          >
            <RefreshCw
              className={cn("size-4", isValidating && "animate-spin text-vps-blue")}
            />
          </Button>
        </div>
      </div>
      {error && (
        <p className="text-xs text-vps-red" role="alert">
          {error instanceof Error ? error.message : "Failed to load logs."}
        </p>
      )}
      <div ref={setRoot} style={{ height }} className="overflow-hidden">
        <ScrollArea className="h-full">
          {isLoading && !lines ? (
            <p className="p-2 font-mono text-xs text-vps-muted">Loading…</p>
          ) : (
            <div className="p-1">
              {filtered?.map((line, i) => {
                const level = levelForLine(line)
                return (
                  <div
                    key={`${i}-${line.slice(0, 24)}`}
                    className={cn(
                      "group flex min-h-[1.1rem] font-mono text-[11px] leading-relaxed vps-log-line animate-vps-log-fade",
                      levelClass[level]
                    )}
                  >
                    <span
                      className="w-7 shrink-0 pr-1 text-right text-vps-muted/80 select-none"
                      aria-hidden
                    >
                      {i + 1}
                    </span>
                    <pre className="m-0 flex-1 whitespace-pre-wrap break-all">
                      {line}
                    </pre>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </div>
      <Separator className="bg-vps-border" />
    </div>
  )
}
