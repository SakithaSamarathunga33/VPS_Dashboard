import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"

import "./globals.css"
import { AppProviders } from "@/components/providers/app-providers"
import { DashboardShell } from "@/components/layout/DashboardShell"
import { cn } from "@/lib/utils"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: "VPS Monitor",
  description: "Docker and host monitoring dashboard (Uptime Kuma style)",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={cn("dark", inter.variable, jetbrains.variable)}
      suppressHydrationWarning
    >
      <body
        className={cn("min-h-screen bg-background font-sans antialiased")}
      >
        <AppProviders>
          <DashboardShell>{children}</DashboardShell>
        </AppProviders>
      </body>
    </html>
  )
}
