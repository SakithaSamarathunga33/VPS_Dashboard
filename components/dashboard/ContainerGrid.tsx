"use client"

import { useContainers } from "@/hooks/useContainers"
import { ContainerCard } from "@/components/dashboard/ContainerCard"
import { Skeleton } from "@/components/ui/skeleton"

function Th({
  children,
  className,
  style,
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <th
      className={`whitespace-nowrap px-3 py-2.5 text-left font-mono text-[11px] font-semibold uppercase tracking-widest ${className ?? ""}`}
      style={{ opacity: 0.45, borderBottom: "1px solid var(--border)", ...style }}
    >
      {children}
    </th>
  )
}

function HeaderRow() {
  return (
    <thead>
      <tr>
        <Th>Container</Th>
        <Th>Status</Th>
        <Th className="hidden lg:table-cell" style={{ width: 200 }}>Uptime</Th>
        <Th>CPU</Th>
        <Th>RAM</Th>
        <Th className="hidden xl:table-cell">Network</Th>
        <Th className="hidden 2xl:table-cell">Disk I/O</Th>
        <Th>Ports</Th>
        <Th>{""}</Th>
      </tr>
    </thead>
  )
}

export function ContainerGrid() {
  const { containers, isLoading, error } = useContainers()

  if (isLoading && !containers?.length) {
    return (
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: "1px solid var(--border)", background: "var(--card)" }}
      >
        <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{ minWidth: 640 }}>
          <HeaderRow />
          <tbody>
            {Array.from({ length: 4 }).map((_, i) => (
              <tr key={i}>
                {Array.from({ length: 5 }).map((_, j) => (
                  <td
                    key={j}
                    className="px-3 py-3"
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <Skeleton className="h-3 w-20" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    )
  }

  if (error && !containers?.length) return null

  if (!containers?.length) {
    return (
      <div
        className="flex min-h-[200px] items-center justify-center rounded-xl"
        style={{ border: "1px dashed var(--border)", background: "var(--card)" }}
      >
        <div className="text-center">
          <p className="text-sm font-medium" style={{ color: "#f0f4f8" }}>
            No containers found
          </p>
          <p className="mt-1 text-xs" style={{ color: "#8899b0" }}>
            Docker containers will appear here when the agent connects.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: "1px solid var(--border)", background: "var(--card)" }}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{ minWidth: 640 }}>
          <HeaderRow />
          <tbody>
            {containers.map((c, i) => (
              <ContainerCard
                key={c.id}
                container={c}
                style={{ "--d": `${i * 40}ms` } as React.CSSProperties}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
