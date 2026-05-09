"use client"

import { memo, useMemo } from "react"

// ---------------------------------------------------------------------------
// Shared path builder
// ---------------------------------------------------------------------------
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

// Stable gradient IDs — one per component instance, never re-generated
let _gradId = 0
function useGradId() {
  return useMemo(() => `g${++_gradId}`, [])
}

// ---------------------------------------------------------------------------
// AreaChart
// ---------------------------------------------------------------------------
export const AreaChart = memo(function AreaChart({
  data = [],
  color = "#4aa2ab",
  height = 80,
}: {
  data: number[]
  color?: string
  height?: number
}) {
  const id = useGradId()
  const w = 300
  const h = height

  const { linePath, areaPath, lastDot } = useMemo(() => {
    const line = buildPath(data, w, h)
    const area = line ? line + ` L${w},${h} L0,${h} Z` : ""
    let dot: { x: number; y: number } | null = null
    if (data.length >= 2) {
      const min = Math.min(...data)
      const max = Math.max(...data)
      const range = max - min || 1
      const last = data[data.length - 1]
      dot = { x: w, y: h - 4 - ((last - min) / range) * (h - 8) }
    }
    return { linePath: line, areaPath: area, lastDot: dot }
  }, [data, h])

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
})

// ---------------------------------------------------------------------------
// DualAreaChart
// ---------------------------------------------------------------------------
export const DualAreaChart = memo(function DualAreaChart({
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
  const idA = useGradId()
  const idB = useGradId()
  const w = 300
  const h = height

  const { lineA, lineB, areaA, areaB } = useMemo(() => {
    const all = [...dataA, ...dataB]
    if (all.length === 0) return { lineA: "", lineB: "", areaA: "", areaB: "" }
    const min = Math.min(...all)
    const max = Math.max(...all) || 1
    const xs = dataA.map((_, i) =>
      dataA.length > 1 ? (i / (dataA.length - 1)) * w : w / 2
    )
    const yA = dataA.map((v) => h - 4 - ((v - min) / (max - min || 1)) * (h - 8))
    const yB = dataB.map((v) => h - 4 - ((v - min) / (max - min || 1)) * (h - 8))

    function makeD(xArr: number[], yArr: number[]) {
      if (xArr.length < 2) return ""
      let d = `M${xArr[0]},${yArr[0]}`
      for (let i = 1; i < xArr.length; i++) {
        const cx = (xArr[i - 1] + xArr[i]) / 2
        d += ` C${cx},${yArr[i - 1]} ${cx},${yArr[i]} ${xArr[i]},${yArr[i]}`
      }
      return d
    }

    const lA = makeD(xs, yA)
    const lB = makeD(xs, yB)
    return {
      lineA: lA,
      lineB: lB,
      areaA: lA ? lA + ` L${w},${h} L0,${h} Z` : "",
      areaB: lB ? lB + ` L${w},${h} L0,${h} Z` : "",
    }
  }, [dataA, dataB, h])

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
      {areaB && <path d={areaB} fill={`url(#${idB})`} />}
      {areaA && <path d={areaA} fill={`url(#${idA})`} />}
      {lineB && <path d={lineB} fill="none" stroke={colorB} strokeWidth="1.5" strokeLinecap="round" />}
      {lineA && <path d={lineA} fill="none" stroke={colorA} strokeWidth="1.5" strokeLinecap="round" />}
    </svg>
  )
})

// ---------------------------------------------------------------------------
// SparkLine
// ---------------------------------------------------------------------------
export const SparkLine = memo(function SparkLine({
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
  const linePath = useMemo(() => buildPath(data, width, height, 2), [data, width, height])
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
})

// ---------------------------------------------------------------------------
// HBar
// ---------------------------------------------------------------------------
export const HBar = memo(function HBar({
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
})

// ---------------------------------------------------------------------------
// DonutChart — offset accumulated via reduce (no side-effects during render)
// ---------------------------------------------------------------------------
export const DonutChart = memo(function DonutChart({
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
  const total = useMemo(
    () => segments.reduce((s, seg) => s + seg.value, 0) || 1,
    [segments]
  )
  const cx = size / 2
  const cy = size / 2

  // Pre-compute offsets immutably
  const arcs = useMemo(() => {
    let offset = 0
    return segments.map((seg) => {
      const start = offset
      offset += seg.value
      return { ...seg, startOffset: start }
    })
  }, [segments])

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
      {arcs.map((seg, i) => {
        const len = (seg.value / total) * circ
        return (
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
              strokeDashoffset: -(seg.startOffset / total) * circ,
              transition: "stroke-dasharray 0.6s",
            }}
            strokeLinecap="butt"
          />
        )
      })}
    </svg>
  )
})
