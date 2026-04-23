import { NextRequest, NextResponse } from 'next/server'
import { restartContainer } from '@/lib/docker'

export const runtime = 'nodejs'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await restartContainer(decodeURIComponent(params.id))
    return NextResponse.json({ success: true, action: 'restart' })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
