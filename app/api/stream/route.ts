import { NextRequest } from 'next/server'
import { getSystemStats } from '@/lib/system'
import { listContainers } from '@/lib/docker'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        const chunk = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(chunk))
      }

      async function push() {
        try {
          const [system, containers] = await Promise.all([
            getSystemStats(),
            listContainers(),
          ])
          send('system', system)
          send('containers', containers)
        } catch {
          // keep the stream alive on transient errors
        }
      }

      await push()
      const interval = setInterval(() => void push(), 2000)

      request.signal.addEventListener('abort', () => {
        clearInterval(interval)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
