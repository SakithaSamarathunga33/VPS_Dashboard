# VPS Monitor

Next.js 14 (App Router) monitoring UI for a small Docker/VPS **agent** API, with an Uptime Kuma–inspired dark dashboard (JetBrains Mono for numbers, cards, live stats, and logs).

## Prerequisites

- Node.js 18+
- A running **agent** that implements the contract in the project (see `lib/agent.ts`).

## Setup

1. `npx create-next-app@14 vps-dashboard --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm`
2. `cd vps-dashboard`
3. `npx shadcn@latest init` (dark theme, neutral/slate as preferred)
4. `npx shadcn@latest add card badge button progress separator tooltip dialog scroll-area tabs dropdown-menu alert-dialog sonner skeleton input`
5. `npm install swr recharts lucide-react next-themes`
6. Copy the app source, `components/`, `hooks/`, `lib/`, `types/`, and config as in this repository.
7. Create `.env.local` from `.env.local.example` and set:
   - `NEXT_PUBLIC_AGENT_URL` — e.g. `http://YOUR_VPS_IP:4000`
   - `NEXT_PUBLIC_AGENT_TOKEN` — bearer token the agent expects
8. `npm run dev` and open [http://localhost:3000](http://localhost:3000) (root redirects to `/dashboard`).

## Environment

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_AGENT_URL` | Base URL of the agent (no trailing slash required) |
| `NEXT_PUBLIC_AGENT_TOKEN` | Value sent as `Authorization: Bearer <token>` |

## Agent contract (summary)

- `GET /system` — host CPU, memory, disk, uptime, hostname, OS.
- `GET /containers` — list of containers with `uptimeHistory` (30 booleans) and `uptimePercent`.
- `GET /containers/:id/stats` — per-container CPU, memory, network, block I/O, pids, timestamp.
- `GET /containers/:id/logs?tail=N` — last `N` log lines (JSON string array).
- `POST /containers/:id/{start,stop,restart}` — control actions.

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run start` — start production server
- `npm run lint` — ESLint

## License

Private / use as needed for your VPS deployment.
