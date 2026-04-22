const express = require("express")
const Docker = require("dockerode")
const si = require("systeminformation")
const cors = require("cors")
require("dotenv").config()

const {
  getRecentLogs,
  getUptimePercent,
  getDailyBlocks,
  getIncidents,
  getUptimeHistoryBools,
} = require("./db")
const { startMonitor } = require("./monitor")

const app = express()
const docker = new Docker({ socketPath: "/var/run/docker.sock" })
const PORT = process.env.PORT || 4000
const TOKEN = process.env.AGENT_TOKEN

app.use(cors())
app.use(express.json())

app.use((req, res, next) => {
  if (req.path === "/health") return next()
  const auth = req.headers.authorization
  if (!auth || auth !== `Bearer ${TOKEN}`) {
    return res.status(401).json({ error: "Unauthorized" })
  }
  next()
})

app.get("/health", (req, res) => res.json({ status: "ok" }))

function mapContainerStatus(state) {
  const s = String(state || "exited").toLowerCase()
  if (s === "running") return "running"
  if (s === "paused") return "paused"
  if (s === "restarting") return "restarting"
  if (s === "dead") return "dead"
  if (s === "exited" || s === "created") return "exited"
  return "exited"
}

app.get("/system", async (req, res) => {
  try {
    const [load, mem, fsSize, osInfo, time] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
      si.osInfo(),
      si.time(),
    ])

    const cpuData = await si.cpu()
    const primaryDisk = fsSize[0] || {}

    res.json({
      cpu: {
        usagePercent: parseFloat(load.currentLoad.toFixed(1)),
        cores: cpuData.cores,
        model: cpuData.brand,
      },
      memory: {
        total: mem.total,
        used: mem.used,
        free: mem.free,
        usagePercent: parseFloat(((mem.used / mem.total) * 100).toFixed(1)),
      },
      disk: {
        total: primaryDisk.size || 0,
        used: primaryDisk.used || 0,
        free: (primaryDisk.size || 0) - (primaryDisk.used || 0),
        usagePercent: parseFloat((primaryDisk.use || 0).toFixed(1)),
      },
      uptime: time.uptime,
      hostname: osInfo.hostname,
      os: `${osInfo.distro} ${osInfo.release}`,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get("/containers", async (req, res) => {
  try {
    const containers = await docker.listContainers({ all: true })

    const result = containers.map((c) => {
      const status = mapContainerStatus(c.State)
      const name = (c.Names[0] || "").replace(/^\//, "")
      return {
        id: c.Id,
        shortId: c.Id.substring(0, 12),
        name,
        image: c.Image,
        status,
        state: c.Status,
        created: new Date(c.Created * 1000).toISOString(),
        ports: (c.Ports || []).map((p) => ({
          ip: p.IP || "0.0.0.0",
          privatePort: p.PrivatePort,
          publicPort: p.PublicPort != null ? p.PublicPort : p.PrivatePort,
          type: p.Type || "tcp",
        })),
        uptimePercent: getUptimePercent(c.Id, 30),
        uptimeHistory: getUptimeHistoryBools(c.Id, 30),
      }
    })

    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get("/containers/:id/stats", async (req, res) => {
  try {
    const container = docker.getContainer(req.params.id)
    const stats = await container.stats({ stream: false })

    const cpuDelta =
      stats.cpu_stats.cpu_usage.total_usage -
      stats.precpu_stats.cpu_usage.total_usage
    const systemDelta =
      stats.cpu_stats.system_cpu_usage -
      stats.precpu_stats.system_cpu_usage
    const numCpus = stats.cpu_stats.online_cpus || 1
    let cpuPercent = 0
    if (systemDelta > 0) {
      cpuPercent = ((cpuDelta / systemDelta) * numCpus * 100)
    }
    cpuPercent = parseFloat(Math.min(100, Math.max(0, cpuPercent)).toFixed(2))

    const memUsage = stats.memory_stats.usage || 0
    const memLimit = stats.memory_stats.limit || 1
    const memPercent = parseFloat(
      ((memUsage / memLimit) * 100).toFixed(2)
    )

    const networks = stats.networks || {}
    const netRx = Object.values(networks).reduce((a, n) => a + n.rx_bytes, 0)
    const netTx = Object.values(networks).reduce((a, n) => a + n.tx_bytes, 0)

    const blkRead = (stats.blkio_stats?.io_service_bytes_recursive || [])
      .filter((b) => b.op === "Read")
      .reduce((a, b) => a + b.value, 0)
    const blkWrite = (stats.blkio_stats?.io_service_bytes_recursive || [])
      .filter((b) => b.op === "Write")
      .reduce((a, b) => a + b.value, 0)

    res.json({
      id: req.params.id,
      cpu: cpuPercent,
      memory: { usage: memUsage, limit: memLimit, percent: memPercent },
      network: { rx: netRx, tx: netTx },
      blockIO: { read: blkRead, write: blkWrite },
      pids: stats.pids_stats?.current || 0,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get("/containers/:id/logs", async (req, res) => {
  try {
    const tail = Math.min(5000, Math.max(1, parseInt(req.query.tail, 10) || 100))
    const container = docker.getContainer(req.params.id)
    const logs = await container.logs({
      stdout: true,
      stderr: true,
      tail,
      timestamps: true,
    })
    const raw = logs.toString("utf8")
    const lines = raw
      .split("\n")
      .map((line) => line.replace(/^[\u0000-\u001F]{1,8}/, "").trim())
      .filter((line) => line.length > 0)
    res.json(lines)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get("/containers/:id/uptime", (req, res) => {
  try {
    const { id } = req.params
    const days = parseInt(req.query.days, 10) || 30

    res.json({
      uptimePercent: getUptimePercent(id, days),
      dailyBlocks: getDailyBlocks(id, days),
      incidents: getIncidents(id, days),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get("/containers/:id/uptime/history", (req, res) => {
  try {
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 90))
    const logs = getRecentLogs(req.params.id, limit)
    res.json({
      history: logs.map((l) => ({
        is_up: l.is_up === 1,
        status: l.status,
        checked_at: l.checked_at,
      })),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post("/containers/:id/start", async (req, res) => {
  try {
    await docker.getContainer(req.params.id).start()
    res.json({ success: true, action: "start" })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post("/containers/:id/stop", async (req, res) => {
  try {
    await docker.getContainer(req.params.id).stop()
    res.json({ success: true, action: "stop" })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post("/containers/:id/restart", async (req, res) => {
  try {
    await docker.getContainer(req.params.id).restart()
    res.json({ success: true, action: "restart" })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.listen(PORT, () => {
  console.log(`[agent] Running on port ${PORT}`)
  startMonitor()
})
