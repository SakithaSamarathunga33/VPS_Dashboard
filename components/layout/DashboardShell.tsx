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
      <div className="md:pl-14 xl:pl-56">
        <TopBar />
        <div className="px-4 pb-24 pt-7 md:px-7 md:pb-7 lg:px-8">
          {children}
        </div>
        <MobileNav />
      </div>
    </div>
  )
}
