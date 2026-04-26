"use client"

import { useMemo } from "react"

function buildPath(data: number[], w: number, h: number, pad = 4): string {
  if (!data || data.length < 2) return ""
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const xs = data.map((_, i) => pad + (i / (data.length - 1)) * (w - pad * 2))
  const ys = data.map((v) => h - pad - ((v - min) / range) * (h - pad * 2))
  let d = `M${xs[0]},${ys[0]}`
  for (let i = 1; i < xs.length; i++) {
    const cx = (xs[i - 1] + xs[i]) / 2
    d += ` C${cx},${ys[i - 1]} ${cx},${ys[i]} ${xs[i]},${ys[i]}`
  }
  return d
}

export function AreaChart({
  data = [],
  color = "#4aa2ab",
  height = 80,
}: {
  data: number[]
  color?: string
  height?: number
}) {
  const id = useMemo(() => "grad-" + Math.random().toString(36).slice(2), [])
  const w = 300
  const h = height
  const linePath = buildPath(data, w, h)
  const areaPath = linePath ? linePath + ` L${w},${h} L0,${h} Z` : ""

  const lastDot = useMemo(() => {
    if (data.length < 2) return null
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1
    const last = data[data.length - 1]
    const x = w
    const y = h - 4 - ((last - min) / range) * (h - 8)
    return { x, y }
  }, [data, w, h])

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        style={{ width: "100%", height, display: "block", overflow: "visible" }}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((t) => (
          <line
            key={t}
            x1="0"
            y1={h * t}
            x2={w}
            y2={h * t}
            stroke="currentColor"
            strokeOpacity="0.06"
            strokeWidth="1"
          />
        ))}
        {areaPath && <path d={areaPath} fill={`url(#${id})`} />}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {lastDot && <circle cx={lastDot.x} cy={lastDot.y} r="3" fill={color} />}
      </svg>
    </div>
  )
}

export function DualAreaChart({
  dataA = [],
  dataB = [],
  colorA = "#4aa2ab",
  colorB = "#8ed8ad",
  height = 80,
}: {
  dataA: number[]
  dataB: number[]
  colorA?: string
  colorB?: string
  height?: number
}) {
  const idA = useMemo(() => "ga-" + Math.random().toString(36).slice(2), [])
  const idB = useMemo(() => "gb-" + Math.random().toString(36).slice(2), [])
  const w = 300
  const h = height
  const all = [...dataA, ...dataB]
  const min = Math.min(...all)
  const max = Math.max(...all) || 1
  const xs = dataA.map((_, i) => (i / (dataA.length - 1)) * w)
  const yA = dataA.map((v) => h - 4 - ((v - min) / (max - min || 1)) * (h - 8))
  const yB = dataB.map((v) => h - 4 - ((v - min) / (max - min || 1)) * (h - 8))

  function makeD(xArr: number[], yArr: number[]) {
    let d = `M${xArr[0]},${yArr[0]}`
    for (let i = 1; i < xArr.length; i++) {
      const cx = (xArr[i - 1] + xArr[i]) / 2
      d += ` C${cx},${yArr[i - 1]} ${cx},${yArr[i]} ${xArr[i]},${yArr[i]}`
    }
    return d
  }

  const lineA = makeD(xs, yA)
  const lineB = makeD(xs, yB)
  const areaA = lineA + ` L${w},${h} L0,${h} Z`
  const areaB = lineB + ` L${w},${h} L0,${h} Z`

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      style={{ width: "100%", height, display: "block", overflow: "visible" }}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={idA} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colorA} stopOpacity="0.2" />
          <stop offset="100%" stopColor={colorA} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={idB} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colorB} stopOpacity="0.15" />
          <stop offset="100%" stopColor={colorB} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((t) => (
        <line
          key={t}
          x1="0"
          y1={h * t}
          x2={w}
          y2={h * t}
          stroke="currentColor"
          strokeOpacity="0.06"
          strokeWidth="1"
        />
      ))}
      <path d={areaB} fill={`url(#${idB})`} />
      <path d={areaA} fill={`url(#${idA})`} />
      <path d={lineB} fill="none" stroke={colorB} strokeWidth="1.5" strokeLinecap="round" />
      <path d={lineA} fill="none" stroke={colorA} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function SparkLine({
  data = [],
  color = "#4aa2ab",
  width = 80,
  height = 32,
}: {
  data: number[]
  color?: string
  width?: number
  height?: number
}) {
  const linePath = buildPath(data, width, height, 2)
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: "block" }}
    >
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function HBar({
  value,
  max = 100,
  color = "#4aa2ab",
  height = 6,
}: {
  value: number
  max?: number
  color?: string
  height?: number
}) {
  const pct = Math.min(100, (value / max) * 100)
  const c = pct > 85 ? "#ef4444" : pct > 70 ? "#f59e0b" : color
  return (
    <div
      className="relative overflow-hidden rounded-full"
      style={{ width: "100%", height, background: "rgba(255,255,255,0.08)" }}
    >
      <div
        className="absolute left-0 top-0 h-full rounded-full"
        style={{
          width: `${pct}%`,
          background: c,
          transition: "width 0.5s cubic-bezier(0.16,1,0.3,1), background 0.3s",
        }}
      />
    </div>
  )
}

export function DonutChart({
  segments = [],
  size = 140,
  strokeWidth = 18,
}: {
  segments: Array<{ label: string; value: number; color: string }>
  size?: number
  strokeWidth?: number
}) {
  const r = size / 2 - strokeWidth / 2 - 2
  const circ = 2 * Math.PI * r
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1
  const cx = size / 2
  const cy = size / 2
  let offset = 0

  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.08"
        strokeWidth={strokeWidth}
      />
      {segments.map((seg, i) => {
        const len = (seg.value / total) * circ
        const el = (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${len - 2} ${circ - len + 2}`}
            style={{
              strokeDashoffset: -(offset / total) * circ,
              transition: "stroke-dasharray 0.6s",
            }}
            strokeLinecap="butt"
          />
        )
        offset += seg.value
        return el
      })}
    </svg>
  )
}
