# Merge VPS Agent into Next.js + SSE Live Streaming Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the standalone `vps-agent` Express service by moving its logic into Next.js, then replace all 1-second SWR polling on the main dashboard with a single Server-Sent Events stream.

**Architecture:** New `lib/` modules (`db.ts`, `system.ts`, `docker.ts`, `monitor.ts`) replace the agent's JS files. A custom `server.ts` starts the background uptime monitor at boot. A single `/api/stream` route pushes `system` and `containers` events to the browser continuously. A React context (`StreamProvider`) holds the SSE connection so every component reads from shared state instead of polling independently.

**Tech Stack:** Next.js 14 App Router, TypeScript, dockerode, systeminformation, better-sqlite3, tsx (custom server runner), Server-Sent Events (`EventSource` browser API)

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Modify | `package.json` | Add server deps + update scripts |
| Modify | `next.config.mjs` | Exclude native modules from bundling |
| Create | `lib/db.ts` | SQLite wrapper (port of vps-agent/db.js) |
| Create | `lib/system.ts` | systeminformation wrapper |
| Create | `lib/docker.ts` | dockerode wrapper |
| Create | `lib/monitor.ts` | Background uptime poller (port of vps-agent/monitor.js) |
| Create | `server.ts` | Custom Next.js server, calls startMonitor() |
| Create | `app/api/stream/route.ts` | SSE endpoint — pushes system + containers events |
| Create | `app/api/system/route.ts` | REST fallback for system stats |
| Create | `app/api/containers/route.ts` | REST container list |
| Create | `app/api/containers/[id]/stats/route.ts` | Per-container stats |
| Create | `app/api/containers/[id]/logs/route.ts` | Container logs |
| Create | `app/api/containers/[id]/uptime/route.ts` | Uptime percent + daily blocks + incidents |
| Create | `app/api/containers/[id]/uptime/history/route.ts` | Recent uptime log history |
| Create | `app/api/containers/[id]/start/route.ts` | Start action |
| Create | `app/api/containers/[id]/stop/route.ts` | Stop action |
| Create | `app/api/containers/[id]/restart/route.ts` | Restart action |
| Delete | `app/api/agent/[...path]/route.ts` | Old proxy — no longer needed |
| Modify | `lib/agent.ts` | Remove fetchSystemStats/fetchContainers, fix base URL to `/api` |
| Create | `context/stream-context.tsx` | SSE context + StreamProvider |
| Modify | `hooks/useSystemStats.ts` | Read from StreamContext instead of SWR |
| Modify | `hooks/useContainers.ts` | Read from StreamContext instead of SWR |
| Modify | `components/providers/app-providers.tsx` | Add StreamProvider |
| Create | `Dockerfile` | Build Next.js with native module support |
| Modify | `docker-compose.yml` | Remove vps-agent service, give dashboard Docker socket access |

---

## Task 1: Install Dependencies and Configure Next.js

**Files:**
- Modify: `package.json`
- Modify: `next.config.mjs`

- [ ] **Step 1: Install server-side dependencies**

```bash
cd d:/Projects/VPS_Dashboard
npm install dockerode systeminformation better-sqlite3 tsx
npm install --save-dev @types/dockerode @types/better-sqlite3
```

Expected output ends with: `added N packages` — no errors.

- [ ] **Step 2: Update `next.config.mjs` to exclude native modules from bundling**

Replace the entire file:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    'better-sqlite3',
    'dockerode',
    'systeminformation',
  ],
}

export default nextConfig
```

- [ ] **Step 3: Verify TypeScript still compiles**

```bash
npx tsc --noEmit
```

Expected: no errors (warnings are OK).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json next.config.mjs
git commit -m "feat: add server deps (dockerode, systeminformation, better-sqlite3, tsx)"
```

---

## Task 2: Create `lib/db.ts`

Port `vps-agent/db.js` to TypeScript. This module is server-only — never imported by client components.

**Files:**
- Create: `lib/db.ts`

- [ ] **Step 1: Create `lib/db.ts`**

```ts
import Database from 'better-sqlite3'
import path from 'node:path'

const DB_PATH = process.env.DB_PATH ?? './vps-monitor.db'
const db = new Database(path.resolve(DB_PATH))

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS uptime_logs (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    container_id   TEXT    NOT NULL,
    container_name TEXT    NOT NULL,
    status         TEXT    NOT NULL,
    is_up          INTEGER NOT NULL DEFAULT 0,
    checked_at     DATETIME DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS uptime_daily (
    container_id   TEXT NOT NULL,
    container_name TEXT NOT NULL,
    date           TEXT NOT NULL,
    up_count       INTEGER DEFAULT 0,
    down_count     INTEGER DEFAULT 0,
    total_count    INTEGER DEFAULT 0,
    PRIMARY KEY (container_id, date)
  );

  CREATE INDEX IF NOT EXISTS idx_uptime_logs_container
    ON uptime_logs(container_id, checked_at);

  CREATE INDEX IF NOT EXISTS idx_uptime_logs_checked
    ON uptime_logs(checked_at);
`)

const insertLog = db.prepare(`
  INSERT INTO uptime_logs (container_id, container_name, status, is_up)
  VALUES (@container_id, @container_name, @status, @is_up)
`)

const upsertDaily = db.prepare(`
  INSERT INTO uptime_daily (container_id, container_name, date, up_count, down_count, total_count)
  VALUES (@container_id, @container_name, @date, @up_count, @down_count, 1)
  ON CONFLICT(container_id, date) DO UPDATE SET
    up_count    = up_count + excluded.up_count,
    down_count  = down_count + excluded.down_count,
    total_count = total_count + 1
`)

export const writePollResult = db.transaction(
  (container_id: string, container_name: string, status: string, is_up: boolean) => {
    insertLog.run({ container_id, container_name, status, is_up: is_up ? 1 : 0 })
    const today = new Date().toISOString().split('T')[0]
    upsertDaily.run({
      container_id,
      container_name,
      date: today,
      up_count: is_up ? 1 : 0,
      down_count: is_up ? 0 : 1,
    })
  }
)

export function getRecentLogs(container_id: string, limit = 90) {
  return db
    .prepare(
      `SELECT is_up, status, checked_at
       FROM uptime_logs
       WHERE container_id = ?
       ORDER BY checked_at DESC
       LIMIT ?`
    )
    .all(container_id, limit) as { is_up: number; status: string; checked_at: string }[]
}

export function getUptimePercent(container_id: string, days = 30): number {
  const row = db
    .prepare(
      `SELECT SUM(up_count) AS total_up, SUM(total_count) AS total_checks
       FROM uptime_daily
       WHERE container_id = ? AND date >= date('now', ?)`
    )
    .get(container_id, `-${days} days`) as { total_up: number; total_checks: number } | undefined
  if (!row || !row.total_checks) return 100
  return parseFloat(((row.total_up / row.total_checks) * 100).toFixed(2))
}

export function getDailyBlocks(container_id: string, days = 30) {
  return db
    .prepare(
      `SELECT date, up_count, down_count, total_count,
         ROUND((CAST(up_count AS REAL) / NULLIF(total_count, 0)) * 100, 1) AS uptime_percent
       FROM uptime_daily
       WHERE container_id = ? AND date >= date('now', ?)
       ORDER BY date ASC`
    )
    .all(container_id, `-${days} days`) as {
      date: string
      up_count: number
      down_count: number
      total_count: number
      uptime_percent: number
    }[]
}

export function getIncidents(container_id: string, days = 30) {
  const logs = db
    .prepare(
      `SELECT is_up, checked_at
       FROM uptime_logs
       WHERE container_id = ? AND checked_at >= datetime('now', ?)
       ORDER BY checked_at ASC`
    )
    .all(container_id, `-${days} days`) as { is_up: number; checked_at: string }[]

  const incidents: { start: string; end: string | null }[] = []
  let incidentStart: string | null = null

  for (const log of logs) {
    if (!log.is_up && !incidentStart) {
      incidentStart = log.checked_at
    } else if (log.is_up && incidentStart) {
      incidents.push({ start: incidentStart, end: log.checked_at })
      incidentStart = null
    }
  }
  if (incidentStart) incidents.push({ start: incidentStart, end: null })
  return incidents
}

export function pruneOldLogs() {
  db.prepare(`DELETE FROM uptime_logs WHERE checked_at < datetime('now', '-90 days')`).run()
  db.prepare(`DELETE FROM uptime_daily WHERE date < date('now', '-90 days')`).run()
}

export function getUptimeHistoryBools(container_id: string, limit = 30): boolean[] {
  const rows = db
    .prepare(
      `SELECT is_up FROM uptime_logs
       WHERE container_id = ?
       ORDER BY checked_at DESC
       LIMIT ?`
    )
    .all(container_id, limit) as { is_up: number }[]
  const out = rows.map((r) => r.is_up === 1).reverse()
  while (out.length < 30) out.unshift(true)
  return out.slice(-30)
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/db.ts
git commit -m "feat: add lib/db.ts — SQLite uptime store (ported from vps-agent)"
```

---

## Task 3: Create `lib/system.ts`

**Files:**
- Create: `lib/system.ts`

- [ ] **Step 1: Create `lib/system.ts`**

```ts
import si from 'systeminformation'
import type { SystemStats } from '@/types/docker'

export async function getSystemStats(): Promise<SystemStats> {
  const [load, mem, fsSize, osInfo, time, cpuData] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.fsSize(),
    si.osInfo(),
    si.time(),
    si.cpu(),
  ])

  const primaryDisk = fsSize[0] ?? {}
  const memUsed = mem.total - (mem.available ?? mem.free)

  return {
    cpu: {
      usagePercent: parseFloat(load.currentLoad.toFixed(1)),
      cores: cpuData.cores,
      model: cpuData.brand,
    },
    memory: {
      total: mem.total,
      used: memUsed,
      free: mem.available ?? mem.free,
      usagePercent: parseFloat(((memUsed / mem.total) * 100).toFixed(1)),
    },
    disk: {
      total: (primaryDisk as { size?: number }).size ?? 0,
      used: (primaryDisk as { used?: number }).used ?? 0,
      free: ((primaryDisk as { size?: number }).size ?? 0) - ((primaryDisk as { used?: number }).used ?? 0),
      usagePercent: parseFloat(((primaryDisk as { use?: number }).use ?? 0).toFixed(1)),
    },
    uptime: time.uptime as number,
    hostname: osInfo.hostname,
    os: `${osInfo.distro} ${osInfo.release}`,
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/system.ts
git commit -m "feat: add lib/system.ts — system stats via systeminformation"
```

---

## Task 4: Create `lib/docker.ts`

**Files:**
- Create: `lib/docker.ts`

- [ ] **Step 1: Create `lib/docker.ts`**

```ts
import Dockerode from 'dockerode'
import type { Container, ContainerStats } from '@/types/docker'
import { getUptimePercent, getUptimeHistoryBools } from '@/lib/db'

const docker = new Dockerode({ socketPath: '/var/run/docker.sock' })

function mapStatus(state: string): Container['status'] {
  const s = String(state ?? 'exited').toLowerCase()
  if (s === 'running') return 'running'
  if (s === 'paused') return 'paused'
  if (s === 'restarting') return 'restarting'
  if (s === 'dead') return 'dead'
  return 'exited'
}

export async function listContainers(): Promise<Container[]> {
  const containers = await docker.listContainers({ all: true })
  return containers.map((c) => ({
    id: c.Id,
    shortId: c.Id.substring(0, 12),
    name: (c.Names[0] ?? '').replace(/^\//, ''),
    image: c.Image,
    status: mapStatus(c.State),
    state: c.Status,
    created: new Date(c.Created * 1000).toISOString(),
    ports: (c.Ports ?? []).map((p) => ({
      ip: p.IP ?? '0.0.0.0',
      privatePort: p.PrivatePort,
      publicPort: p.PublicPort ?? p.PrivatePort,
      type: p.Type ?? 'tcp',
    })),
    uptimePercent: getUptimePercent(c.Id, 30),
    uptimeHistory: getUptimeHistoryBools(c.Id, 30),
  }))
}

export async function getContainerStats(id: string): Promise<ContainerStats> {
  const container = docker.getContainer(id)
  const stats = await container.stats({ stream: false })

  const cpuDelta =
    stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage
  const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage
  const numCpus = stats.cpu_stats.online_cpus ?? 1
  let cpuPercent = systemDelta > 0 ? (cpuDelta / systemDelta) * numCpus * 100 : 0
  cpuPercent = parseFloat(Math.min(100, Math.max(0, cpuPercent)).toFixed(2))

  const memStats = stats.memory_stats.stats ?? {}
  const pageCache = memStats.inactive_file ?? memStats.cache ?? 0
  const memUsage = Math.max(0, (stats.memory_stats.usage ?? 0) - pageCache)
  const memLimit = stats.memory_stats.limit ?? 1

  const networks = stats.networks ?? {}
  const netRx = Object.values(networks).reduce((a: number, n: { rx_bytes: number }) => a + n.rx_bytes, 0)
  const netTx = Object.values(networks).reduce((a: number, n: { tx_bytes: number }) => a + n.tx_bytes, 0)

  const blkRead = (stats.blkio_stats?.io_service_bytes_recursive ?? [])
    .filter((b: { op: string }) => b.op === 'Read')
    .reduce((a: number, b: { value: number }) => a + b.value, 0)
  const blkWrite = (stats.blkio_stats?.io_service_bytes_recursive ?? [])
    .filter((b: { op: string }) => b.op === 'Write')
    .reduce((a: number, b: { value: number }) => a + b.value, 0)

  return {
    id,
    cpu: cpuPercent,
    memory: { usage: memUsage, limit: memLimit, percent: parseFloat(((memUsage / memLimit) * 100).toFixed(2)) },
    network: { rx: netRx, tx: netTx },
    blockIO: { read: blkRead, write: blkWrite },
    pids: stats.pids_stats?.current ?? 0,
    timestamp: new Date().toISOString(),
  }
}

export async function getContainerLogs(id: string, tail: number): Promise<string[]> {
  const t = Math.min(5000, Math.max(1, tail))
  const container = docker.getContainer(id)
  const logs = await container.logs({ stdout: true, stderr: true, tail: t, timestamps: true })
  return logs
    .toString('utf8')
    .split('\n')
    .map((line: string) => line.replace(/^[ -]{1,8}/, '').trim())
    .filter((line: string) => line.length > 0)
}

export async function startContainer(id: string): Promise<void> {
  await docker.getContainer(id).start()
}

export async function stopContainer(id: string): Promise<void> {
  await docker.getContainer(id).stop()
}

export async function restartContainer(id: string): Promise<void> {
  await docker.getContainer(id).restart()
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/docker.ts
git commit -m "feat: add lib/docker.ts — dockerode wrapper (ported from vps-agent)"
```

---

## Task 5: Create `lib/monitor.ts`

**Files:**
- Create: `lib/monitor.ts`

- [ ] **Step 1: Create `lib/monitor.ts`**

```ts
import { listContainers } from '@/lib/docker'
import { writePollResult, pruneOldLogs } from '@/lib/db'

const POLL_INTERVAL = (parseInt(process.env.POLL_INTERVAL_SECONDS ?? '30', 10)) * 1000

async function pollContainers() {
  try {
    const containers = await listContainers()
    for (const c of containers) {
      writePollResult(c.id, c.name, c.status, c.status === 'running')
    }
    console.log(`[monitor] Polled ${containers.length} containers at ${new Date().toISOString()}`)
  } catch (err) {
    console.error('[monitor] Poll error:', (err as Error).message)
  }
}

export function startMonitor(): void {
  void pollContainers()
  setInterval(() => void pollContainers(), POLL_INTERVAL)
  setInterval(pruneOldLogs, 24 * 60 * 60 * 1000)
  console.log(`[monitor] Started. Polling every ${POLL_INTERVAL / 1000}s`)
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/monitor.ts
git commit -m "feat: add lib/monitor.ts — background uptime poller (ported from vps-agent)"
```

---

## Task 6: Create `server.ts` and Update `package.json` Scripts

**Files:**
- Create: `server.ts`
- Modify: `package.json`

- [ ] **Step 1: Create `server.ts`**

```ts
import { createServer } from 'node:http'
import next from 'next'

const dev = process.env.NODE_ENV !== 'production'
const hostname = '0.0.0.0'
const port = parseInt(process.env.PORT ?? '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(async () => {
  const { startMonitor } = await import('./lib/monitor')
  startMonitor()

  createServer(handle).listen(port, hostname, () => {
    console.log(`[server] Ready on http://${hostname}:${port}`)
  })
})
```

- [ ] **Step 2: Update `package.json` scripts**

Change only the `"scripts"` block:

```json
"scripts": {
  "dev": "tsx server.ts",
  "build": "next build",
  "start": "NODE_ENV=production tsx server.ts",
  "lint": "next lint"
},
```

- [ ] **Step 3: Verify dev server starts**

```bash
npm run dev
```

Expected output contains:
```
[monitor] Started. Polling every 30s
[server] Ready on http://0.0.0.0:3000
```

Stop with Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add server.ts package.json
git commit -m "feat: add custom Next.js server that starts background monitor on boot"
```

---

## Task 7: Create the SSE Stream Endpoint

**Files:**
- Create: `app/api/stream/route.ts`

- [ ] **Step 1: Create `app/api/stream/route.ts`**

```ts
import { NextRequest } from 'next/server'
import { getSystemStats } from '@/lib/system'
import { listContainers } from '@/lib/docker'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        const chunk = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(chunk))
      }

      async function push() {
        try {
          const [system, containers] = await Promise.all([
            getSystemStats(),
            listContainers(),
          ])
          send('system', system)
          send('containers', containers)
        } catch {
          // keep the stream alive on transient errors
        }
      }

      await push()
      const interval = setInterval(() => void push(), 1000)

      request.signal.addEventListener('abort', () => {
        clearInterval(interval)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
```

- [ ] **Step 2: Start dev server and verify SSE endpoint**

```bash
npm run dev
```

In a new terminal:

```bash
curl -N http://localhost:3000/api/stream
```

Expected: continuous stream of lines like:
```
event: system
data: {"cpu":{"usagePercent":5.2,...},"memory":{...},...}

event: containers
data: [{"id":"abc123","name":"nginx",...}]
```

Press Ctrl+C to stop.

- [ ] **Step 3: Commit**

```bash
git add app/api/stream/route.ts
git commit -m "feat: add /api/stream SSE endpoint — pushes system + container events every 1s"
```

---

## Task 8: Create REST API Routes (System + Containers)

**Files:**
- Create: `app/api/system/route.ts`
- Create: `app/api/containers/route.ts`

- [ ] **Step 1: Create `app/api/system/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { getSystemStats } from '@/lib/system'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const stats = await getSystemStats()
    return NextResponse.json(stats)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create `app/api/containers/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { listContainers } from '@/lib/docker'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const containers = await listContainers()
    return NextResponse.json(containers)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
```

- [ ] **Step 3: Verify both routes respond**

```bash
curl http://localhost:3000/api/system | head -c 200
curl http://localhost:3000/api/containers | head -c 200
```

Expected: JSON objects, no error fields.

- [ ] **Step 4: Commit**

```bash
git add app/api/system/route.ts app/api/containers/route.ts
git commit -m "feat: add /api/system and /api/containers direct REST routes"
```

---

## Task 9: Create Container Sub-Routes

**Files:**
- Create: `app/api/containers/[id]/stats/route.ts`
- Create: `app/api/containers/[id]/logs/route.ts`
- Create: `app/api/containers/[id]/uptime/route.ts`
- Create: `app/api/containers/[id]/uptime/history/route.ts`
- Create: `app/api/containers/[id]/start/route.ts`
- Create: `app/api/containers/[id]/stop/route.ts`
- Create: `app/api/containers/[id]/restart/route.ts`

- [ ] **Step 1: Create `app/api/containers/[id]/stats/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getContainerStats } from '@/lib/docker'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const stats = await getContainerStats(decodeURIComponent(params.id))
    return NextResponse.json(stats)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create `app/api/containers/[id]/logs/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getContainerLogs } from '@/lib/docker'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tail = Math.min(5000, Math.max(1, parseInt(req.nextUrl.searchParams.get('tail') ?? '100', 10)))
    const logs = await getContainerLogs(decodeURIComponent(params.id), tail)
    return NextResponse.json(logs)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
```

- [ ] **Step 3: Create `app/api/containers/[id]/uptime/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getUptimePercent, getDailyBlocks, getIncidents } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = decodeURIComponent(params.id)
    const days = Math.min(365, Math.max(1, parseInt(req.nextUrl.searchParams.get('days') ?? '30', 10)))
    return NextResponse.json({
      uptimePercent: getUptimePercent(id, days),
      dailyBlocks: getDailyBlocks(id, days),
      incidents: getIncidents(id, days),
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
```

- [ ] **Step 4: Create `app/api/containers/[id]/uptime/history/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getRecentLogs } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = decodeURIComponent(params.id)
    const limit = Math.min(500, Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') ?? '90', 10)))
    const logs = getRecentLogs(id, limit)
    return NextResponse.json({
      history: logs.map((l) => ({
        is_up: l.is_up === 1,
        status: l.status,
        checked_at: l.checked_at,
      })),
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
```

- [ ] **Step 5: Create `app/api/containers/[id]/start/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { startContainer } from '@/lib/docker'

export const runtime = 'nodejs'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await startContainer(decodeURIComponent(params.id))
    return NextResponse.json({ success: true, action: 'start' })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
```

- [ ] **Step 6: Create `app/api/containers/[id]/stop/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { stopContainer } from '@/lib/docker'

export const runtime = 'nodejs'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await stopContainer(decodeURIComponent(params.id))
    return NextResponse.json({ success: true, action: 'stop' })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
```

- [ ] **Step 7: Create `app/api/containers/[id]/restart/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { restartContainer } from '@/lib/docker'

export const runtime = 'nodejs'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await restartContainer(decodeURIComponent(params.id))
    return NextResponse.json({ success: true, action: 'restart' })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
```

- [ ] **Step 8: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add app/api/containers/
git commit -m "feat: add all container sub-routes (stats, logs, uptime, start, stop, restart)"
```

---

## Task 10: Remove Old Proxy and Update `lib/agent.ts`

**Files:**
- Delete: `app/api/agent/[...path]/route.ts`
- Modify: `lib/agent.ts`

- [ ] **Step 1: Delete the old proxy route**

```bash
rm -rf app/api/agent
```

- [ ] **Step 2: Replace `lib/agent.ts`**

The proxy fetcher functions for system and containers are replaced by SSE. Keep all per-container functions but fix the base URL from `/api/agent` to `/api`.

Replace the entire file:

```ts
import type { ContainerStats } from '@/types/docker'

export class AgentError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly path?: string
  ) {
    super(message)
    this.name = 'AgentError'
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `/api${path.startsWith('/') ? path : `/${path}`}`
  const res = await fetch(url, {
    ...init,
    cache: 'no-store',
    headers: { Accept: 'application/json', ...init?.headers },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new AgentError(text || `Request failed: ${res.status} ${res.statusText}`, res.status, path)
  }
  const text = await res.text()
  if (!text) return undefined as T
  return JSON.parse(text) as T
}

async function requestPostVoid(path: string): Promise<void> {
  const url = `/api${path.startsWith('/') ? path : `/${path}`}`
  const res = await fetch(url, {
    method: 'POST',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new AgentError(text || `Request failed: ${res.status} ${res.statusText}`, res.status, path)
  }
}

export async function fetchContainerStats(id: string): Promise<ContainerStats> {
  return requestJson<ContainerStats>(`/containers/${encodeURIComponent(id)}/stats`)
}

export async function fetchContainerLogs(id: string, tail: number): Promise<string[]> {
  const t = Math.max(1, Math.min(5000, tail))
  return requestJson<string[]>(`/containers/${encodeURIComponent(id)}/logs?tail=${t}`)
}

export async function startContainer(id: string): Promise<void> {
  await requestPostVoid(`/containers/${encodeURIComponent(id)}/start`)
}

export async function stopContainer(id: string): Promise<void> {
  await requestPostVoid(`/containers/${encodeURIComponent(id)}/stop`)
}

export async function restartContainer(id: string): Promise<void> {
  await requestPostVoid(`/containers/${encodeURIComponent(id)}/restart`)
}

export type UptimeHistoryEntry = {
  is_up: boolean
  status: string
  checked_at: string
}

export type UptimeDailyBlock = {
  date: string
  up_count: number
  down_count: number
  total_count: number
  uptime_percent: number
}

export type UptimeIncident = {
  start: string
  end: string | null
}

export async function fetchUptimeHistory(
  id: string,
  limit = 90
): Promise<{ history: UptimeHistoryEntry[] }> {
  const l = Math.min(500, Math.max(1, limit))
  return requestJson<{ history: UptimeHistoryEntry[] }>(
    `/containers/${encodeURIComponent(id)}/uptime/history?limit=${l}`
  )
}

export async function fetchUptimeStats(
  id: string,
  days = 30
): Promise<{ uptimePercent: number; dailyBlocks: UptimeDailyBlock[]; incidents: UptimeIncident[] }> {
  const d = Math.min(365, Math.max(1, days))
  return requestJson<{ uptimePercent: number; dailyBlocks: UptimeDailyBlock[]; incidents: UptimeIncident[] }>(
    `/containers/${encodeURIComponent(id)}/uptime?days=${d}`
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/agent.ts
git rm -r app/api/agent
git commit -m "feat: remove agent proxy, update lib/agent.ts base URL to /api"
```

---

## Task 11: Create `context/stream-context.tsx`

This is the single SSE connection shared across the whole app.

**Files:**
- Create: `context/stream-context.tsx`

- [ ] **Step 1: Create `context/stream-context.tsx`**

```tsx
'use client'

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import type { SystemStats, Container } from '@/types/docker'

interface StreamState {
  system: SystemStats | null
  containers: Container[] | null
  connected: boolean
  error: string | null
}

const defaultState: StreamState = {
  system: null,
  containers: null,
  connected: false,
  error: null,
}

const StreamContext = createContext<StreamState>(defaultState)

export function StreamProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<StreamState>(defaultState)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    function connect() {
      const es = new EventSource('/api/stream')
      esRef.current = es

      es.onopen = () =>
        setState((s) => ({ ...s, connected: true, error: null }))

      es.onerror = () =>
        setState((s) => ({ ...s, connected: false, error: 'Stream disconnected' }))

      es.addEventListener('system', (e) => {
        try {
          const system = JSON.parse(e.data) as SystemStats
          setState((s) => ({ ...s, system }))
        } catch {
          // ignore malformed frame
        }
      })

      es.addEventListener('containers', (e) => {
        try {
          const containers = JSON.parse(e.data) as Container[]
          setState((s) => ({ ...s, containers }))
        } catch {
          // ignore malformed frame
        }
      })
    }

    connect()
    return () => {
      esRef.current?.close()
    }
  }, [])

  return (
    <StreamContext.Provider value={state}>
      {children}
    </StreamContext.Provider>
  )
}

export function useStream(): StreamState {
  return useContext(StreamContext)
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add context/stream-context.tsx
git commit -m "feat: add StreamContext — single SSE connection shared across all components"
```

---

## Task 12: Update `useSystemStats` and `useContainers` to Read from SSE

**Files:**
- Modify: `hooks/useSystemStats.ts`
- Modify: `hooks/useContainers.ts`

- [ ] **Step 1: Replace `hooks/useSystemStats.ts`**

```ts
'use client'

import { useStream } from '@/context/stream-context'

export function useSystemStats() {
  const { system, connected, error } = useStream()

  return {
    stats: system,
    error: !connected && error ? new Error(error) : null,
    isLoading: system === null,
    isValidating: false,
    refresh: async () => {},
  }
}
```

- [ ] **Step 2: Replace `hooks/useContainers.ts`**

```ts
'use client'

import { useStream } from '@/context/stream-context'

export function useContainers() {
  const { containers, connected, error } = useStream()

  return {
    containers: containers ?? [],
    error: !connected && error ? new Error(error) : null,
    isLoading: containers === null,
    isValidating: false,
    refresh: async () => {},
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add hooks/useSystemStats.ts hooks/useContainers.ts
git commit -m "feat: useSystemStats + useContainers now read from SSE stream context"
```

---

## Task 13: Wire Up `StreamProvider` in App Providers

**Files:**
- Modify: `components/providers/app-providers.tsx`

- [ ] **Step 1: Read current `components/providers/app-providers.tsx`**

Open the file and check its current contents before editing.

- [ ] **Step 2: Add `StreamProvider`**

The file currently wraps children in `ThemeProvider`, `TooltipProvider`, and `Toaster`. Add `StreamProvider` as the outermost wrapper (so all hooks below it can use the stream).

Replace the entire file:

```tsx
'use client'

import { ThemeProvider } from 'next-themes'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { StreamProvider } from '@/context/stream-context'

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <StreamProvider>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <TooltipProvider delayDuration={300}>
          {children}
          <Toaster richColors position="bottom-right" />
        </TooltipProvider>
      </ThemeProvider>
    </StreamProvider>
  )
}
```

- [ ] **Step 3: Start dev server and verify the dashboard loads with live data**

```bash
npm run dev
```

Open `http://localhost:3000/dashboard` in a browser.

Expected:
- Dashboard loads with live CPU/RAM/disk data updating smoothly
- Container list shows and updates
- Browser DevTools → Network tab shows one persistent `EventStream` request to `/api/stream`
- No failed `/api/agent/` requests

- [ ] **Step 4: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/providers/app-providers.tsx
git commit -m "feat: add StreamProvider to app root — SSE live data wired end-to-end"
```

---

## Task 14: Update `Dockerfile` and `docker-compose.yml`

**Files:**
- Create/Modify: `Dockerfile` (at project root)
- Modify: `docker-compose.yml`

- [ ] **Step 1: Check for existing root-level Dockerfile**

```bash
ls Dockerfile 2>/dev/null && echo "exists" || echo "not found"
```

- [ ] **Step 2: Create/replace root `Dockerfile`**

```dockerfile
FROM node:18-alpine AS base

# native build tools needed for better-sqlite3
RUN apk add --no-cache python3 make g++

WORKDIR /app

FROM base AS deps
COPY package*.json ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/tsconfig.json ./tsconfig.json

EXPOSE 3000
CMD ["npm", "start"]
```

- [ ] **Step 3: Replace `docker-compose.yml`**

Remove the `vps-agent` service. Give the dashboard Docker socket access and the SQLite volume.

```yaml
version: '3.8'

services:
  vps-dashboard:
    build: .
    container_name: vps-dashboard
    restart: unless-stopped
    environment:
      POLL_INTERVAL_SECONDS: 30
      DB_PATH: /data/vps-monitor.db
      PORT: 3000
    volumes:
      - ./data:/data
      - /var/run/docker.sock:/var/run/docker.sock
    expose:
      - "3000"
    networks:
      - caddy_net

networks:
  caddy_net:
    external: true
```

- [ ] **Step 4: Create a `.env.example` at project root**

```bash
cat > .env.example << 'EOF'
POLL_INTERVAL_SECONDS=30
DB_PATH=./vps-monitor.db
PORT=3000
EOF
```

- [ ] **Step 5: Commit**

```bash
git add Dockerfile docker-compose.yml .env.example
git commit -m "feat: update Dockerfile + docker-compose — single service, no vps-agent"
```

---

## Final Verification

- [ ] **Run a full build to confirm there are no build errors**

```bash
npm run build
```

Expected: `✓ Compiled successfully` — no TypeScript or webpack errors.

- [ ] **Confirm no references to the old `/api/agent` path remain**

```bash
grep -r "api/agent" app/ hooks/ lib/ components/ --include="*.ts" --include="*.tsx"
```

Expected: no output (zero matches).

- [ ] **Confirm `swr` is no longer used in the two main hooks**

```bash
grep -l "useSWR" hooks/useSystemStats.ts hooks/useContainers.ts
```

Expected: no output (neither file imports useSWR).

- [ ] **Commit final verification**

```bash
git commit --allow-empty -m "chore: verify SSE migration complete — no remaining /api/agent references"
```
