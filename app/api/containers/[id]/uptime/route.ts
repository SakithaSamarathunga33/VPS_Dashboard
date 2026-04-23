import { NextRequest, NextResponse } from 'next/server'
import { getUptimePercent, getDailyBlocks, getIncidents } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = decodeURIComponent(params.id)
    const days = Math.min(365, Math.max(1, parseInt(req.nextUrl.searchParams.get('days') ?? '30', 10)))
    return NextResponse.json({
      uptimePercent: getUptimePercent(id, days),
      dailyBlocks: getDailyBlocks(id, days),
      incidents: getIncidents(id, days),
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
