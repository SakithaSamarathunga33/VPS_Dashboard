import { MobileNav } from "@/components/layout/MobileNav"
import { Sidebar } from "@/components/layout/Sidebar"
import { TopBar } from "@/components/layout/TopBar"

type DashboardShellProps = {
  children: React.ReactNode
}

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-vps-bg text-vps-text">
      <Sidebar />
      <div className="md:pl-14 xl:pl-60">
        <TopBar />
        <div className="px-3 pb-24 md:px-4 md:pb-6 lg:px-5">{children}</div>
        <MobileNav />
      </div>
    </div>
  )
}
