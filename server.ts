import { createServer } from 'node:http'
import next from 'next'

const dev = process.env.NODE_ENV !== 'production'
const hostname = '0.0.0.0'
const port = parseInt(process.env.PORT ?? '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(async () => {
  const { startMonitor } = await import('./lib/monitor')
  startMonitor()

  createServer(handle).listen(port, hostname, () => {
    console.log(`[server] Ready on http://${hostname}:${port}`)
  })
})
