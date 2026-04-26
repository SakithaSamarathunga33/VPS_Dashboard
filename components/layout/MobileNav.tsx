"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Container,
  ScrollText,
  Bell,
  Settings,
} from "lucide-react"

import { cn } from "@/lib/utils"

const items = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/containers", label: "Docker", icon: Container },
  { href: "/logs", label: "Logs", icon: ScrollText },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function MobileNav() {
  const pathname = usePathname()
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      style={{ background: "#0b1220cc", borderTop: "1px solid rgba(255,255,255,0.06)" }}
      aria-label="Primary"
    >
      {items.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/")
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors",
              active
                ? "text-[#4aa2ab]"
                : "text-[rgba(247,250,252,0.4)] hover:text-[rgba(247,250,252,0.8)]"
            )}
          >
            <Icon className="size-5" />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
