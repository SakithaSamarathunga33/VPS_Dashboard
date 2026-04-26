"use client"

import { useContainers } from "@/hooks/useContainers"
import { useContainerStats } from "@/hooks/useContainerStats"
import { formatBytes, formatPercent } from "@/lib/utils"
import { HBar } from "@/components/charts"

function DashCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 0,
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
      }}
    >
      {children}
    </div>
  )
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`px-4 py-2.5 text-left font-mono text-[11px] font-semibold uppercase tracking-widest ${className ?? ""}`}
      style={{ opacity: 0.45, borderBottom: "1px solid var(--border)" }}
    >
      {children}
    </th>
  )
}

function ContainerRow({ id, name, image }: { id: string; name: string; image: string }) {
  const { stats } = useContainerStats(id)

  return (
    <tr
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.025)"
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = ""
      }}
    >
      {/* Name + image */}
      <td className="px-4 py-2.5" style={{ borderBottom: "1px solid var(--border)", fontSize: 13 }}>
        <div className="font-mono font-semibold" style={{ color: "#f0f4f8" }}>{name}</div>
        <div className="font-mono text-[10px]" style={{ color: "#8899b0" }}>{image}</div>
      </td>

      {/* CPU */}
      <td className="px-4 py-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
        {stats ? (
          <div style={{ minWidth: 80 }}>
            <div
              className="mb-1 font-mono text-[11px]"
              style={{ color: stats.cpu > 70 ? "#f59e0b" : "#f0f4f8" }}
            >
              {formatPercent(stats.cpu, 1)}
            </div>
            <HBar value={stats.cpu} max={100} color="#4aa2ab" height={3} />
          </div>
        ) : (
          <span className="font-mono text-xs" style={{ opacity: 0.35 }}>—</span>
        )}
      </td>

      {/* Memory */}
      <td className="px-4 py-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
        {stats ? (
          <div style={{ minWidth: 100 }}>
            <div className="mb-1 font-mono text-[11px]" style={{ color: "#f0f4f8" }}>
              {formatBytes(stats.memory.usage)}{" "}
              <span style={{ opacity: 0.45 }}>{formatPercent(stats.memory.percent, 0)}</span>
            </div>
            <HBar value={stats.memory.percent} max={100} color="#8ed8ad" height={3} />
          </div>
        ) : (
          <span className="font-mono text-xs" style={{ opacity: 0.35 }}>—</span>
        )}
      </td>

      {/* Network RX/TX */}
      <td className="hidden px-4 py-2.5 lg:table-cell" style={{ borderBottom: "1px solid var(--border)" }}>
        {stats ? (
          <div className="font-mono text-[11px]" style={{ color: "#8899b0" }}>
            <div>↓ {formatBytes(stats.network.rx)}</div>
            <div>↑ {formatBytes(stats.network.tx)}</div>
          </div>
        ) : (
          <span className="font-mono text-xs" style={{ opacity: 0.35 }}>—</span>
        )}
      </td>

      {/* Block I/O */}
      <td className="hidden px-4 py-2.5 xl:table-cell" style={{ borderBottom: "1px solid var(--border)" }}>
        {stats ? (
          <div className="font-mono text-[11px]" style={{ color: "#8899b0" }}>
            <div>R {formatBytes(stats.blockIO.read)}</div>
            <div>W {formatBytes(stats.blockIO.write)}</div>
          </div>
        ) : (
          <span className="font-mono text-xs" style={{ opacity: 0.35 }}>—</span>
        )}
      </td>

      {/* PIDs */}
      <td className="px-4 py-2.5" style={{ borderBottom: "1px solid var(--border)", fontSize: 13 }}>
        {stats ? (
          <span className="font-mono text-[11px]" style={{ opacity: 0.55 }}>
            {stats.pids}
          </span>
        ) : (
          <span className="font-mono text-xs" style={{ opacity: 0.35 }}>—</span>
        )}
      </td>
    </tr>
  )
}

export default function ProcessesPage() {
  const { containers } = useContainers()
  const running = containers?.filter((c) => c.status === "running") ?? []

  return (
    <div className="space-y-5">
      <p className="text-sm" style={{ color: "#8899b0" }}>
        Live resource usage per running Docker container — updated every second via the agent.
        CPU, memory, network, block I/O, and PID counts are all real data.
      </p>

      <DashCard>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <Th>Container</Th>
              <Th>CPU</Th>
              <Th>Memory</Th>
              <Th className="hidden lg:table-cell">Network</Th>
              <Th className="hidden xl:table-cell">Disk I/O</Th>
              <Th>PIDs</Th>
            </tr>
          </thead>
          <tbody>
            {running.length > 0 ? (
              running.map((c) => (
                <ContainerRow key={c.id} id={c.id} name={c.name} image={c.image} />
              ))
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-sm"
                  style={{ opacity: 0.4 }}
                >
                  No running containers
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </DashCard>
    </div>
  )
}
