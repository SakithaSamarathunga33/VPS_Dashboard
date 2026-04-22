"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Container,
  LayoutDashboard,
  ScrollText,
  Activity,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { useSystemStats } from "@/hooks/useSystemStats"

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/containers", label: "Containers", icon: Container },
  { href: "/logs", label: "Logs", icon: ScrollText },
]

export function Sidebar() {
  const pathname = usePathname()
  const { stats, error, isValidating } = useSystemStats()
  const connected = Boolean(stats) && !error
  const hostname = stats?.hostname ?? "—"

  return (
    <aside
      className="fixed top-0 left-0 z-30 hidden h-screen w-14 flex-col border-r border-vps-border bg-vps-card/90 backdrop-blur xl:w-60 md:flex"
      aria-label="Sidebar"
    >
      <div className="flex h-14 items-center gap-2 border-b border-vps-border px-2 xl:px-3">
        <Image
          src="/logo.png"
          alt="VPS Monitor"
          width={36}
          height={36}
          className="size-9 shrink-0 rounded-lg object-cover"
        />
        <div className="hidden min-w-0 flex-1 xl:block">
          <p className="truncate font-semibold text-vps-text">VPS Monitor</p>
          <p className="text-[10px] text-vps-muted">Docker</p>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-2" aria-label="Main">
        {nav.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || (href !== "/dashboard" && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-vps-border/80 text-vps-text"
                  : "text-vps-muted hover:bg-vps-border/50 hover:text-vps-text"
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="hidden xl:inline">{label}</span>
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-vps-border p-2">
        <div className="hidden items-center gap-2 rounded-lg border border-vps-border/80 bg-vps-bg/50 px-2 py-2 xl:flex">
          <Activity className="size-4 text-vps-muted" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-vps-text" title={hostname}>
              {hostname}
            </p>
            <p className="text-[10px] text-vps-muted">Host</p>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-center gap-2 text-[10px] text-vps-muted xl:justify-start">
          <span
            className={cn(
              "size-2 rounded-full",
              connected ? "bg-vps-green" : "bg-vps-red"
            )}
            style={
              connected
                ? { boxShadow: "0 0 0 0 rgba(63, 185, 80, 0.45)" }
                : undefined
            }
            title={isValidating ? "Syncing" : connected ? "Connected" : "Offline"}
            aria-label={connected ? "Connected" : "Offline"}
          />
          <span className="hidden xl:inline">
            {connected ? "Agent OK" : "No agent"}
          </span>
        </div>
      </div>
    </aside>
  )
}
