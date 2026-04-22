# VPS agent

Express + Dockerode + SQLite (`better-sqlite3`) agent that exposes host metrics, container stats, logs, and **persistent uptime history** (poll-based, similar to Uptime Kuma). Pair it with the Next.js `vps-dashboard` in this repo.

## Environment

Copy `.env` and set a strong `AGENT_TOKEN`. Defaults:

- `PORT=4000`
- `POLL_INTERVAL_SECONDS=30` — how often to record container up/down in SQLite
- `DB_PATH=./vps-monitor.db` — SQLite file (WAL mode)

## Local setup

1. Copy this folder to your VPS (or develop on the same machine as Docker).
2. Install **Node.js 18+**
3. `cd vps-agent && npm install`
4. Edit `.env` (especially `AGENT_TOKEN`).
5. Ensure the Docker socket is readable:  
   `sudo usermod -aG docker $USER` (then re-login), or run the agent as root.
6. Start: `node agent.js` or `npm start`

## API

- `GET /health` — no auth
- All other routes require: `Authorization: Bearer <AGENT_TOKEN>`
- Uptime: `GET /containers/:id/uptime?days=30`, `GET /containers/:id/uptime/history?limit=90`

## Run as a systemd service (Linux)

Create `/etc/systemd/system/vps-agent.service`:

```ini
[Unit]
Description=VPS Docker Monitor Agent
After=network.target docker.service

[Service]
Type=simple
User=YOUR_USER
WorkingDirectory=/path/to/vps-agent
ExecStart=/usr/bin/node /path/to/vps-agent/agent.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=/path/to/vps-agent/.env

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable vps-agent
sudo systemctl start vps-agent
sudo systemctl status vps-agent
```

## Notes

- The DB grows with `POLL_INTERVAL_SECONDS` and the number of containers; `pruneOldLogs` removes data older than 90 days (runs daily).
- On Windows, the default Docker named pipe is different from Linux’s `/var/run/docker.sock`. Run this agent in Linux/WSL2 or a VM that exposes the Docker engine socket as in the script.
