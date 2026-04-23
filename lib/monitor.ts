import { listContainers } from '@/lib/docker'
import { writePollResult, pruneOldLogs } from '@/lib/db'

const POLL_INTERVAL = (parseInt(process.env.POLL_INTERVAL_SECONDS ?? '30', 10)) * 1000

async function pollContainers(): Promise<void> {
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
