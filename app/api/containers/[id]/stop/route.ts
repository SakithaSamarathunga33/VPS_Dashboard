import { NextRequest, NextResponse } from 'next/server'
import { stopContainer } from '@/lib/docker'

export const runtime = 'nodejs'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await stopContainer(decodeURIComponent(params.id))
    return NextResponse.json({ success: true, action: 'stop' })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
