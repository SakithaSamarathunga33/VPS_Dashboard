import { NextRequest, NextResponse } from 'next/server'
import { getContainerLogs } from '@/lib/docker'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tail = Math.min(5000, Math.max(1, parseInt(req.nextUrl.searchParams.get('tail') ?? '100', 10)))
    const logs = await getContainerLogs(decodeURIComponent(params.id), tail)
    return NextResponse.json(logs)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
