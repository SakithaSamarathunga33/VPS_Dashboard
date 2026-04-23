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
