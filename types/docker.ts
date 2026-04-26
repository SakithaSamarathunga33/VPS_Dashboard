export interface NetworkInterface {
  iface: string
  rx_bytes: number
  tx_bytes: number
  rx_sec: number
  tx_sec: number
}

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
    filesystems: Array<{
      fs: string
      type: string
      size: number
      used: number
      available: number
      usagePercent: number
      mount: string
    }>
    io: {
      read_sec: number
      write_sec: number
    }
  }
  network: NetworkInterface[]
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
