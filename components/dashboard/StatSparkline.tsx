"use client"

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  YAxis,
} from "recharts"

import { cn } from "@/lib/utils"

type Point = { i: number; v: number }

type StatSparklineProps = {
  data: Point[]
  color: string
  className?: string
}

export function StatSparkline({ data, color, className }: StatSparklineProps) {
  const rows = data.length
    ? data
    : [{ i: 0, v: 0 }]

  return (
    <div className={cn("h-16 w-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <YAxis domain={[0, 100]} hide />
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            fill={color}
            fillOpacity={0.15}
            strokeWidth={1.5}
            isAnimationActive
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
