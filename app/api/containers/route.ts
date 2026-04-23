import { NextResponse } from 'next/server'
import { listContainers } from '@/lib/docker'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const containers = await listContainers()
    return NextResponse.json(containers)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
