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
  return (logs as Buffer)
    .toString('utf8')
    .split('\n')
    .map((line: string) => line.replace(/^[ -]{1,8}/, '').trim())
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
