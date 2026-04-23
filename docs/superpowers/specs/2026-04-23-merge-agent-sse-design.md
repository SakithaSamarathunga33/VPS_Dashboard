# Design: Merge VPS Agent into Next.js + SSE Live Streaming

**Date:** 2026-04-23  
**Status:** Approved

---

## Goal

Eliminate the `vps-agent` as a separate service. Move its logic directly into the Next.js project and replace all 1-second SWR polling on the main dashboard with a single Server-Sent Events (SSE) stream. One deployment, zero proxy hops, genuinely real-time data.

---

## Current Architecture

```
Browser
  └─ SWR poll every 1s → Next.js /api/agent/[...path]
       └─ fetch proxy → vps-agent Express (port 4000)
            ├─ dockerode  (Docker socket)
            ├─ systeminformation  (CPU/RAM/disk)
            └─ better-sqlite3  (uptime history)
```

Problems:
- Two HTTP hops per request (browser → Next.js → agent)
- 10+ components each polling independently every second
- No real-time: data is always up to 1s stale

---

## Target Architecture

```
Browser
  └─ EventSource (one persistent connection) → Next.js /api/stream
       └─ Next.js custom server
            ├─ lib/docker.ts     (dockerode)
            ├─ lib/system.ts     (systeminformation)
            ├─ lib/db.ts         (better-sqlite3, uptime history)
            └─ lib/monitor.ts    (background uptime poller, started at boot)
```

---

## Section 1: Server-Side — New lib/ Modules

Convert the three `vps-agent` JS files to TypeScript modules inside the Next.js project.

### `lib/docker.ts`
- Wraps `dockerode`
- Exports: `listContainers()`, `getContainerStats(id)`, `getContainerLogs(id, tail)`, `startContainer(id)`, `stopContainer(id)`, `restartContainer(id)`
- Single shared Docker instance (module-level singleton)

### `lib/system.ts`
- Wraps `systeminformation`
- Exports: `getSystemStats()` — returns `{ cpu, memory, disk, uptime, hostname, os }`
- Matches existing `SystemStats` TypeScript type exactly

### `lib/db.ts`
- Wraps `better-sqlite3`
- Exports all existing DB functions: `writePollResult`, `getRecentLogs`, `getUptimePercent`, `getDailyBlocks`, `getIncidents`, `pruneOldLogs`, `getUptimeHistoryBools`
- DB path from `process.env.DB_PATH` or `./vps-monitor.db`
- WAL mode + foreign keys pragma (same as current)

### `lib/monitor.ts`
- Exports: `startMonitor()` — starts the uptime polling interval
- Polls Docker every `POLL_INTERVAL_SECONDS` (default 30s), writes to SQLite via `lib/db.ts`
- Prunes old logs daily
- Must be called once at server startup

---

## Section 2: Custom Next.js Server

Create `server.ts` at project root. This is required because:
1. `startMonitor()` must run as a long-lived background process
2. `better-sqlite3` is a native Node.js module that needs the full Node runtime

```ts
// server.ts
import { createServer } from 'http'
import next from 'next'
import { startMonitor } from './lib/monitor'

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handler = app.getRequestHandler()

app.prepare().then(() => {
  startMonitor()
  createServer(handler).listen(process.env.PORT ?? 3000, () => {
    console.log('[server] Ready')
  })
})
```

`package.json` scripts update:
- `"dev": "tsx server.ts"`
- `"build": "next build"`
- `"start": "NODE_ENV=production tsx server.ts"`

Dependencies to add: `tsx`, `@types/node`, `dockerode`, `@types/dockerode`, `systeminformation`, `better-sqlite3`, `@types/better-sqlite3`

---

## Section 3: New API Routes

Replace the catch-all proxy `/api/agent/[...path]` with direct route handlers.

### `app/api/stream/route.ts` — SSE endpoint (new)
- Returns a `ReadableStream` with `Content-Type: text/event-stream`
- On connect: immediately sends current system stats + container list
- Loop: every 1000ms, fetch fresh `getSystemStats()` + `listContainers()`, send as typed SSE events
- Event format:
  ```
  event: system
  data: {"cpu":{"usagePercent":12.3,...},...}

  event: containers
  data: [{"id":"abc123","name":"nginx",...}]
  ```
- On client disconnect: `request.signal.addEventListener('abort', cleanup)`
- Auth: no token needed — SSE is served by the same Next.js process as the frontend. `AGENT_TOKEN` was only for inter-service communication (Next.js→agent) which no longer exists after the merge. All other API routes (start/stop/restart) are POST-only and protected by same-origin policy.

### `app/api/system/route.ts`
- GET: calls `getSystemStats()`, returns JSON
- Used as fallback / initial load

### `app/api/containers/route.ts`
- GET: calls `listContainers()`, returns JSON with `uptimePercent` + `uptimeHistory` from DB

### `app/api/containers/[id]/stats/route.ts`
- GET: calls `getContainerStats(id)`, returns JSON

### `app/api/containers/[id]/logs/route.ts`
- GET: calls `getContainerLogs(id, tail)`, returns JSON

### `app/api/containers/[id]/uptime/route.ts`
- GET: calls `getUptimePercent`, `getDailyBlocks`, `getIncidents` from `lib/db.ts`

### `app/api/containers/[id]/uptime/history/route.ts`
- GET: calls `getRecentLogs` from `lib/db.ts`

### `app/api/containers/[id]/start/route.ts`
### `app/api/containers/[id]/stop/route.ts`
### `app/api/containers/[id]/restart/route.ts`
- POST: calls corresponding `lib/docker.ts` action

### Delete: `app/api/agent/[...path]/route.ts`

---

## Section 4: Client-Side — SSE Hook + Updated Data Hooks

### `hooks/useStream.ts` — new generic SSE hook
- Opens `EventSource` to `/api/stream`
- Parses typed events (`system`, `containers`)
- Returns `{ system, containers, connected, error }`
- Auto-reconnects on disconnect (EventSource does this natively)
- Closes connection on component unmount

### `hooks/useSystemStats.ts` — replace SWR with SSE
- Reads `system` data from `useStream()` context
- Same return shape: `{ stats, error, isLoading, isValidating, refresh }`
- `refresh` triggers a manual re-fetch from `/api/system`

### `hooks/useContainers.ts` — replace SWR with SSE
- Reads `containers` data from `useStream()` context
- Same return shape: `{ containers, error, isLoading, isValidating, refresh }`

### `hooks/useContainerStats.ts` — keep SWR at 1s
- Only active on container detail page, acceptable as REST poll
- No change needed

### `hooks/useContainerLogs.ts` — keep SWR
- No change needed

### `hooks/useUptimeHistory.ts` — keep SWR at 30s
- No change needed

### SSE context provider
- Add `StreamProvider` to `components/providers/app-providers.tsx`
- Opens one EventSource per app session (not per component)
- `useSystemStats` and `useContainers` read from this shared context — zero duplicate connections

### `lib/agent.ts` updates
- Remove `fetchSystemStats()` and `fetchContainers()` (replaced by SSE)
- Update URL paths: `/system` → `/api/system`, `/containers` → `/api/containers`, etc.
- Keep all container action functions (start/stop/restart/logs/uptime)

---

## Section 5: Deployment

### Docker changes
Next.js container needs Docker socket access. Update `docker-compose.yml`:
```yaml
services:
  dashboard:
    build: .
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./vps-monitor.db:/app/vps-monitor.db
    environment:
      - AGENT_TOKEN=${AGENT_TOKEN}
      - DB_PATH=/app/vps-monitor.db
    ports:
      - "3000:3000"
```

Remove `vps-agent` service entirely.

### `Dockerfile` update (Next.js)
```dockerfile
FROM node:18-alpine
RUN apk add --no-cache python3 make g++  # for better-sqlite3 native build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment variables (`.env`)
```
AGENT_TOKEN=your-secret-token
DB_PATH=./vps-monitor.db
POLL_INTERVAL_SECONDS=30
PORT=3000
```

---

## What Does NOT Change

- All React components (zero visual changes)
- All TypeScript types in `types/docker.ts`
- `useContainerStats`, `useContainerLogs`, `useUptimeHistory` hooks
- Tailwind config, globals.css, all UI components
- `lib/utils.ts`

---

## Performance Impact

| Metric | Before | After |
|--------|--------|-------|
| HTTP requests/second | 10+ (each component polls independently) | 0 (SSE push, no polling) |
| Data hops | 2 (browser→Next.js→agent) | 1 (browser←Next.js SSE) |
| Latency to browser | Up to 1000ms (poll interval) | ~50ms (push on read) |
| Connections per tab | 10+ SWR connections | 1 SSE + REST for actions |
| Re-renders/second | 10+ cascading | Only on actual data change |

---

## Implementation Order

1. Add dependencies to `package.json`
2. Create `lib/docker.ts`, `lib/system.ts`, `lib/db.ts`, `lib/monitor.ts`
3. Create `server.ts` (custom server), update `package.json` scripts
4. Create all new `app/api/` route handlers
5. Delete `app/api/agent/[...path]/route.ts`
6. Create `hooks/useStream.ts` + `StreamProvider`
7. Update `hooks/useSystemStats.ts` and `hooks/useContainers.ts`
8. Update `lib/agent.ts` (remove old fetchers, fix paths)
9. Update `components/providers/app-providers.tsx` (add StreamProvider)
10. Update `Dockerfile` and `docker-compose.yml`
11. Update TopBar to remove countdown (already done)
