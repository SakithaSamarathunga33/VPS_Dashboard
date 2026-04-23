import { NextResponse } from 'next/server'
import { getSystemStats } from '@/lib/system'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const stats = await getSystemStats()
    return NextResponse.json(stats)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
