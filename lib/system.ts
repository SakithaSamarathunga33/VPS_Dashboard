import si from 'systeminformation'
import type { SystemStats } from '@/types/docker'

// ---------------------------------------------------------------------------
// TTL cache — avoids re-running expensive SI calls every tick
// ---------------------------------------------------------------------------
interface CacheEntry<T> {
  data: T
  ts: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _cache = new Map<string, CacheEntry<any>>()

async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const now = Date.now()
  const hit = _cache.get(key) as CacheEntry<T> | undefined
  if (hit && now - hit.ts < ttlMs) return hit.data
  const data = await fn()
  _cache.set(key, { data, ts: now })
  return data
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export async function getSystemStats(): Promise<SystemStats> {
  // Fast probes — always fresh (cheap calls)
  const [load, mem] = await Promise.all([
    si.currentLoad(),
    si.mem(),
  ])

  // Slow probes — cached to avoid hammering the OS every tick
  const [fsSize, netStats, diskIO, cpuData, osInfo, time, procs] = await Promise.all([
    cached('fsSize',   10_000, () => si.fsSize()),          // 10 s
    cached('netStats',  2_000, () => si.networkStats('*')), //  2 s
    cached('diskIO',    2_000, () => si.disksIO()),         //  2 s
    cached('cpuData',  60_000, () => si.cpu()),             // 60 s — model/cores never change
    cached('osInfo',   60_000, () => si.osInfo()),          // 60 s — static
    cached('time',      1_000, () => Promise.resolve(si.time())), // 1 s
    si.processes(),                                          // always fresh — needs delta to compute cpu%
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
      free:
        ((primaryDisk as { size?: number }).size ?? 0) -
        ((primaryDisk as { used?: number }).used ?? 0),
      usagePercent: parseFloat(((primaryDisk as { use?: number }).use ?? 0).toFixed(1)),
      filesystems: fsSize.map((f) => ({
        fs: f.fs,
        type: f.type,
        size: f.size,
        used: f.used,
        available: f.available,
        usagePercent: parseFloat((f.use ?? 0).toFixed(1)),
        mount: f.mount,
      })),
      io: {
        read_sec: Math.max(0, (diskIO as { rx_sec?: number }).rx_sec ?? 0),
        write_sec: Math.max(0, (diskIO as { wx_sec?: number }).wx_sec ?? 0),
      },
    },
    network: netStats
      .filter((n) => !n.iface.startsWith('lo'))
      .map((n) => ({
        iface: n.iface,
        rx_bytes: n.rx_bytes,
        tx_bytes: n.tx_bytes,
        rx_sec: Math.max(0, n.rx_sec ?? 0),
        tx_sec: Math.max(0, n.tx_sec ?? 0),
      })),
    uptime: (time as { uptime: number }).uptime ?? 0,
    hostname: osInfo.hostname,
    os: `${osInfo.distro} ${osInfo.release}`,
    processes: procs.list
      .filter((p) => p.cpu > 0 || p.name)
      .sort((a, b) => b.cpu - a.cpu)
      .slice(0, 20)
      .map((p) => ({
        pid: p.pid,
        name: p.name,
        cpuPercent: parseFloat(p.cpu.toFixed(1)),
        memPercent: parseFloat(p.mem.toFixed(1)),
        user: p.user ?? '',
        state: p.state ?? '',
        command: (p.command ?? p.name).slice(0, 80),
      })),
  }
}
