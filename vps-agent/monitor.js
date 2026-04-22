const Docker = require("dockerode")
const { writePollResult, pruneOldLogs } = require("./db")
require("dotenv").config()

const docker = new Docker({ socketPath: "/var/run/docker.sock" })
const POLL_INTERVAL = (parseInt(process.env.POLL_INTERVAL_SECONDS, 10) || 30) * 1000

async function pollContainers() {
  try {
    const containers = await docker.listContainers({ all: true })

    for (const container of containers) {
      const id = container.Id
      const name = (container.Names[0] || "").replace(/^\//, "")
      const status = container.State || "unknown"
      const isUp = String(status).toLowerCase() === "running"

      writePollResult(id, name, status, isUp)
    }

    console.log(
      `[monitor] Polled ${containers.length} containers at ${new Date().toISOString()}`
    )
  } catch (err) {
    console.error("[monitor] Poll error:", err.message)
  }
}

function startMonitor() {
  pollContainers()
  setInterval(pollContainers, POLL_INTERVAL)
  setInterval(pruneOldLogs, 24 * 60 * 60 * 1000)

  console.log(`[monitor] Started. Polling every ${POLL_INTERVAL / 1000}s`)
}

module.exports = { startMonitor }
