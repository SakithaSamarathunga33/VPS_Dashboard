import { NextRequest, NextResponse } from 'next/server'
import { getRecentLogs } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = decodeURIComponent(params.id)
    const limit = Math.min(500, Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') ?? '90', 10)))
    const logs = getRecentLogs(id, limit)
    return NextResponse.json({
      history: logs.map((l) => ({
        is_up: l.is_up === 1,
        status: l.status,
        checked_at: l.checked_at,
      })),
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
