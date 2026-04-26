import si from 'systeminformation'
import type { SystemStats } from '@/types/docker'

export async function getSystemStats(): Promise<SystemStats> {
  const [load, mem, fsSize, osInfo, time, cpuData, netStats, diskIO] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.fsSize(),
    si.osInfo(),
    si.time(),
    si.cpu(),
    si.networkStats('*'),
    si.disksIO(),
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
    uptime: time.uptime as number,
    hostname: osInfo.hostname,
    os: `${osInfo.distro} ${osInfo.release}`,
  }
}
