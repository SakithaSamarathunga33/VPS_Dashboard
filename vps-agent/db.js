const Database = require("better-sqlite3")
const path = require("path")
require("dotenv").config()

const DB_PATH = process.env.DB_PATH || "./vps-monitor.db"
const db = new Database(path.resolve(__dirname, DB_PATH))

db.pragma("journal_mode = WAL")
db.pragma("foreign_keys = ON")

db.exec(`
  CREATE TABLE IF NOT EXISTS uptime_logs (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    container_id   TEXT    NOT NULL,
    container_name TEXT    NOT NULL,
    status         TEXT    NOT NULL,
    is_up          INTEGER NOT NULL DEFAULT 0,
    checked_at     DATETIME DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS uptime_daily (
    container_id   TEXT NOT NULL,
    container_name TEXT NOT NULL,
    date           TEXT NOT NULL,
    up_count       INTEGER DEFAULT 0,
    down_count     INTEGER DEFAULT 0,
    total_count    INTEGER DEFAULT 0,
    PRIMARY KEY (container_id, date)
  );

  CREATE INDEX IF NOT EXISTS idx_uptime_logs_container
    ON uptime_logs(container_id, checked_at);

  CREATE INDEX IF NOT EXISTS idx_uptime_logs_checked
    ON uptime_logs(checked_at);
`)

const insertLog = db.prepare(`
  INSERT INTO uptime_logs (container_id, container_name, status, is_up)
  VALUES (@container_id, @container_name, @status, @is_up)
`)

const upsertDaily = db.prepare(`
  INSERT INTO uptime_daily (container_id, container_name, date, up_count, down_count, total_count)
  VALUES (@container_id, @container_name, @date, @up_count, @down_count, 1)
  ON CONFLICT(container_id, date) DO UPDATE SET
    up_count    = up_count + excluded.up_count,
    down_count  = down_count + excluded.down_count,
    total_count = total_count + 1
`)

const writePollResult = db.transaction(
  (container_id, container_name, status, is_up) => {
    insertLog.run({
      container_id,
      container_name,
      status,
      is_up: is_up ? 1 : 0,
    })
    const today = new Date().toISOString().split("T")[0]
    upsertDaily.run({
      container_id,
      container_name,
      date: today,
      up_count: is_up ? 1 : 0,
      down_count: is_up ? 0 : 1,
    })
  }
)

/**
 * @param {string} container_id
 * @param {number} [limit=90]
 */
function getRecentLogs(container_id, limit = 90) {
  return db
    .prepare(
      `
    SELECT is_up, status, checked_at
    FROM uptime_logs
    WHERE container_id = ?
    ORDER BY checked_at DESC
    LIMIT ?
  `
    )
    .all(container_id, limit)
    .reverse()
}

/**
 * @param {string} container_id
 * @param {number} [days=30]
 */
function getUptimePercent(container_id, days = 30) {
  const mod = `-${days} days`
  const row = db
    .prepare(
      `
    SELECT
      SUM(up_count)    AS total_up,
      SUM(total_count) AS total_checks
    FROM uptime_daily
    WHERE container_id = ?
      AND date >= date('now', ?)
  `
    )
    .get(container_id, mod)

  if (!row || !row.total_checks) return 100
  return parseFloat(
    ((row.total_up / row.total_checks) * 100).toFixed(2)
  )
}

/**
 * @param {string} container_id
 * @param {number} [days=30]
 */
function getDailyBlocks(container_id, days = 30) {
  const mod = `-${days} days`
  return db
    .prepare(
      `
    SELECT date, up_count, down_count, total_count,
      ROUND((CAST(up_count AS REAL) / NULLIF(total_count, 0)) * 100, 1) AS uptime_percent
    FROM uptime_daily
    WHERE container_id = ?
      AND date >= date('now', ?)
    ORDER BY date ASC
  `
    )
    .all(container_id, mod)
}

/**
 * @param {string} container_id
 * @param {number} [days=30]
 */
function getIncidents(container_id, days = 30) {
  const mod = `-${days} days`
  const logs = db
    .prepare(
      `
    SELECT is_up, checked_at
    FROM uptime_logs
    WHERE container_id = ?
      AND checked_at >= datetime('now', ?)
    ORDER BY checked_at ASC
  `
    )
    .all(container_id, mod)

  const incidents = []
  let incidentStart = null

  for (const log of logs) {
    if (!log.is_up && !incidentStart) {
      incidentStart = log.checked_at
    } else if (log.is_up && incidentStart) {
      incidents.push({ start: incidentStart, end: log.checked_at })
      incidentStart = null
    }
  }
  if (incidentStart) {
    incidents.push({ start: incidentStart, end: null })
  }
  return incidents
}

function pruneOldLogs() {
  db.prepare(
    `DELETE FROM uptime_logs WHERE checked_at < datetime('now', '-90 days')`
  ).run()
  db.prepare(
    `DELETE FROM uptime_daily WHERE date < date('now', '-90 days')`
  ).run()
}

/** Last N poll ticks as boolean[] (oldest → newest), padded to 30 for legacy UI */
function getUptimeHistoryBools(container_id, limit = 30) {
  const rows = db
    .prepare(
      `
    SELECT is_up
    FROM uptime_logs
    WHERE container_id = ?
    ORDER BY checked_at DESC
    LIMIT ?
  `
    )
    .all(container_id, limit)
  const bools = rows.map((r) => r.is_up === 1)
  const out = bools.slice().reverse()
  while (out.length < 30) {
    out.unshift(true)
  }
  return out.slice(-30)
}

module.exports = {
  writePollResult,
  getRecentLogs,
  getUptimePercent,
  getDailyBlocks,
  getIncidents,
  pruneOldLogs,
  getUptimeHistoryBools,
}
