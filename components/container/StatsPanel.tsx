"use client"

import { useMemo } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useContainerStats } from "@/hooks/useContainerStats"
import { formatBytes, formatPercent } from "@/lib/utils"
import { LogViewer } from "@/components/container/LogViewer"

type StatsPanelProps = {
  containerId: string
  containerName: string
}

export function StatsPanel({ containerId, containerName }: StatsPanelProps) {
  const { stats, history, error, isLoading } = useContainerStats(containerId)

  const series = useMemo(() => {
    return history.map((h, i) => ({
      i,
      t: h.timestamp,
      cpu: h.cpu,
      mem: h.memory.percent,
      rx: h.network.rx,
      tx: h.network.tx,
    }))
  }, [history])

  const netSeries = useMemo(() => {
    if (!series.length) return []
    const base = series[0]!
    return series.map((row) => ({
      i: row.i,
      t: row.t,
      rx: row.rx - base.rx,
      tx: row.tx - base.tx,
    }))
  }, [series])

  const diskDeltas = useMemo(() => {
    const d: { i: number; read: number; write: number }[] = []
    for (let i = 1; i < history.length; i += 1) {
      const cur = history[i]!
      const prev = history[i - 1]!
      d.push({
        i,
        read: Math.max(0, cur.blockIO.read - prev.blockIO.read),
        write: Math.max(0, cur.blockIO.write - prev.blockIO.write),
      })
    }
    return d
  }, [history])

  const latest = stats
  if (isLoading && !latest) {
    return (
      <div className="min-h-40 text-sm text-vps-muted">Loading container stats…</div>
    )
  }

  if (error && !latest) {
    return (
      <p className="text-sm text-vps-red" role="alert">
        {error instanceof Error ? error.message : "Could not read stats for this container."}
      </p>
    )
  }

  if (!latest) {
    return null
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-vps-text">{containerName}</h2>
        <Badge
          className="border-vps-border/80 font-mono text-vps-text"
        >
          pids: {latest.pids}
        </Badge>
      </div>
      <Tabs defaultValue="overview" className="w-full">
        <TabsList
          variant="line"
          className="w-full justify-start overflow-x-auto border-b border-vps-border/80"
        >
          <TabsTrigger value="overview" className="shrink-0">
            Overview
          </TabsTrigger>
          <TabsTrigger value="network" className="shrink-0">
            Network
          </TabsTrigger>
          <TabsTrigger value="disk" className="shrink-0">
            Disk
          </TabsTrigger>
          <TabsTrigger value="logs" className="shrink-0">
            Logs
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="pt-2">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Card className="border-vps-border bg-vps-card">
              <CardHeader>
                <CardTitle className="text-sm">CPU</CardTitle>
                <p className="font-mono text-3xl font-semibold text-vps-text">
                  {formatPercent(latest.cpu, 1)}
                </p>
              </CardHeader>
              <CardContent>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={
                        series.length
                          ? series
                          : [
                              {
                                i: 0,
                                cpu: 0,
                                mem: 0,
                                t: "",
                                rx: 0,
                                tx: 0,
                              },
                            ]
                      }
                    >
                      <YAxis domain={[0, 100]} width={32} className="text-xs" />
                      <XAxis dataKey="i" hide tick={{ fontSize: 10 }} />
                      <RTooltip
                        contentStyle={{ background: "var(--card)" }}
                        labelClassName="text-xs"
                      />
                      <Area
                        type="monotone"
                        dataKey="cpu"
                        stroke="#4aa2ab"
                        fill="#4aa2ab"
                        fillOpacity={0.12}
                        strokeWidth={1.2}
                        isAnimationActive
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card className="border-vps-border bg-vps-card">
              <CardHeader>
                <CardTitle className="text-sm">Memory</CardTitle>
                <p className="font-mono text-sm text-vps-muted">
                  {formatBytes(latest.memory.usage)} / {formatBytes(latest.memory.limit)} ·{
                    " "
                  }
                  {formatPercent(latest.memory.percent, 1)}
                </p>
              </CardHeader>
              <CardContent>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={
                        series.length
                          ? series
                          : [
                              {
                                i: 0,
                                cpu: 0,
                                mem: 0,
                                t: "",
                                rx: 0,
                                tx: 0,
                              },
                            ]
                      }
                    >
                      <YAxis domain={[0, 100]} width={32} className="text-xs" />
                      <XAxis dataKey="i" hide tick={{ fontSize: 10 }} />
                      <RTooltip
                        contentStyle={{ background: "var(--card)" }}
                        labelClassName="text-xs"
                      />
                      <Area
                        type="monotone"
                        dataKey="mem"
                        stroke="#8ed8ad"
                        fill="#8ed8ad"
                        fillOpacity={0.12}
                        strokeWidth={1.2}
                        isAnimationActive
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="network" className="pt-2">
          <Card className="border-vps-border bg-vps-card">
            <CardHeader>
              <CardTitle className="text-sm">Network throughput (since this series)</CardTitle>
              <p className="text-xs text-vps-muted">
                RX / TX are cumulative. Chart shows totals relative to the first sample
                in this view.
              </p>
            </CardHeader>
            <CardContent>
              <p className="mb-2 font-mono text-xs text-vps-muted">
                Cumulative: ↓ {formatBytes(latest.network.rx)} · ↑{" "}
                {formatBytes(latest.network.tx)}
              </p>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={
                      netSeries.length
                        ? netSeries
                        : [{ i: 0, t: "", rx: 0, tx: 0 }]
                    }
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-vps-border/50" />
                    <XAxis dataKey="i" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <RTooltip
                      contentStyle={{ background: "var(--card)" }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="rx"
                      name="RX"
                      stroke="#8ed8ad"
                      dot={false}
                      isAnimationActive
                    />
                    <Line
                      type="monotone"
                      dataKey="tx"
                      name="TX"
                      stroke="#4aa2ab"
                      dot={false}
                      isAnimationActive
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="disk" className="pt-2">
          <Card className="border-vps-border bg-vps-card">
            <CardHeader>
              <CardTitle className="text-sm">Block I/O (per tick)</CardTitle>
              <p className="text-xs text-vps-muted">
                Deltas between agent samples, not long-term host totals.
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={
                      diskDeltas.length
                        ? diskDeltas
                        : [
                            { i: 0, read: 0, write: 0 },
                            { i: 1, read: 0, write: 0 },
                          ]
                    }
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-vps-border/50" />
                    <XAxis dataKey="i" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <RTooltip
                      contentStyle={{ background: "var(--card)" }}
                    />
                    <Legend />
                    <Bar
                      dataKey="read"
                      name="Read"
                      fill="#f59e0b"
                      isAnimationActive
                    />
                    <Bar
                      dataKey="write"
                      name="Write"
                      fill="#ef4444"
                      isAnimationActive
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="logs" className="pt-2">
          <div className="rounded-xl border border-vps-border bg-vps-bg/30 p-2">
            <LogViewer containerId={containerId} height={400} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
