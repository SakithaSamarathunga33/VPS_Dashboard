import { NextRequest, NextResponse } from 'next/server'
import { getContainerStats } from '@/lib/docker'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const stats = await getContainerStats(decodeURIComponent(params.id))
    return NextResponse.json(stats)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
