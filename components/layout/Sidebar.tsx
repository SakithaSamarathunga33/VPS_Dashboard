"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Cpu,
  Container,
  HardDrive,
  Wifi,
  List,
  ScrollText,
  Bell,
  Settings,
  Activity,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { useSystemStats } from "@/hooks/useSystemStats"

const navGroups = [
  {
    label: "Monitor",
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
      { href: "/cpu", label: "CPU & Memory", icon: Cpu },
      { href: "/containers", label: "Docker", icon: Container },
      { href: "/disk", label: "Disk & I/O", icon: HardDrive },
      { href: "/network", label: "Network", icon: Wifi },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/processes", label: "Processes", icon: List },
      { href: "/logs", label: "Logs", icon: ScrollText },
      { href: "/alerts", label: "Alerts", icon: Bell },
    ],
  },
  {
    label: "Config",
    items: [
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { stats, error } = useSystemStats()
  const connected = Boolean(stats) && !error
  const hostname = stats?.hostname ?? "—"

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href
    return pathname === href || pathname.startsWith(href + "/") || pathname.startsWith(href)
  }

  return (
    <aside
      className="fixed top-0 left-0 z-30 hidden h-screen w-14 flex-col md:flex xl:w-56"
      style={{ background: "#0b1220", borderRight: "1px solid rgba(255,255,255,0.06)" }}
      aria-label="Sidebar"
    >
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 px-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="relative shrink-0">
          <Image
            src="/images/logo.png"
            alt="VPS Monitor"
            width={30}
            height={30}
            className="size-8 rounded-lg object-cover"
          />
        </div>
        <div className="hidden min-w-0 flex-1 xl:block">
          <p className="truncate text-sm font-bold tracking-tight" style={{ color: "#f0f4f8", letterSpacing: "-0.02em" }}>
            VPS Monitor
          </p>
          <p className="font-mono text-[10px]" style={{ color: "#64748b", marginTop: 1 }}>
            v1.0 · live
          </p>
        </div>
        <div className="vps-live-dot ml-auto hidden xl:block" />
      </div>

      {/* Hostname pill */}
      <div className="hidden px-2 py-2.5 xl:block" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div
          className="flex items-center gap-2 rounded-lg px-2.5 py-2 transition-colors"
          style={{ background: "rgba(255,255,255,0.04)" }}
        >
          <span
            className="inline-block size-2 shrink-0 rounded-full"
            style={{ background: connected ? "#8ed8ad" : "#6b7280" }}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold" style={{ color: "#f0f4f8" }}>{hostname}</p>
            <p className="font-mono text-[10px]" style={{ color: "#64748b" }}>
              {stats?.os ?? "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col overflow-y-auto px-2 py-2" aria-label="Main">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p
              className="hidden px-2 pb-1.5 pt-3.5 font-mono text-[10px] font-semibold uppercase tracking-widest xl:block"
              style={{ color: "#64748b", letterSpacing: "0.08em" }}
            >
              {group.label}
            </p>
            <div className="space-y-px">
              {group.items.map(({ href, label, icon: Icon, exact }) => {
                const active = isActive(href, exact)
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2 py-2 text-[13.5px] font-medium transition-all duration-150",
                      active
                        ? "text-[#f0f4f8]"
                        : "text-[rgba(247,250,252,0.5)] hover:text-[#f0f4f8]"
                    )}
                    style={
                      active
                        ? { background: "rgba(255,255,255,0.08)" }
                        : undefined
                    }
                    onMouseEnter={(e) => {
                      if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"
                    }}
                    onMouseLeave={(e) => {
                      if (!active) (e.currentTarget as HTMLElement).style.background = ""
                    }}
                  >
                    <Icon
                      className="size-[18px] shrink-0"
                      style={{ color: active ? "#4aa2ab" : undefined }}
                    />
                    <span className="hidden xl:inline">{label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-2 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="hidden items-center justify-between xl:flex" style={{ fontSize: 11, color: "#64748b" }}>
          <span>Live updates</span>
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block size-2 rounded-full"
              style={{ background: connected ? "#8ed8ad" : "#6b7280" }}
            />
            <span style={{ color: connected ? "#8ed8ad" : "#6b7280" }}>
              {connected ? "online" : "offline"}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-center xl:hidden">
          <Activity
            className="size-4"
            style={{ color: connected ? "#8ed8ad" : "#6b7280" }}
          />
        </div>
      </div>
    </aside>
  )
}
