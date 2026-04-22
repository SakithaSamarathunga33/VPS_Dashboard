export interface SystemStats {
  cpu: {
    usagePercent: number
    cores: number
    model: string
  }
  memory: {
    total: number
    used: number
    free: number
    usagePercent: number
  }
  disk: {
    total: number
    used: number
    free: number
    usagePercent: number
  }
  uptime: number
  hostname: string
  os: string
}

export interface Container {
  id: string
  shortId: string
  name: string
  image: string
  status: "running" | "exited" | "paused" | "restarting" | "dead"
  state: string
  created: string
  ports: Array<{
    ip: string
    privatePort: number
    publicPort: number
    type: string
  }>
  uptimePercent: number
  uptimeHistory: boolean[]
}

export interface ContainerStats {
  id: string
  cpu: number
  memory: {
    usage: number
    limit: number
    percent: number
  }
  network: {
    rx: number
    tx: number
  }
  blockIO: {
    read: number
    write: number
  }
  pids: number
  timestamp: string
}
