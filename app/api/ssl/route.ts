import { NextRequest, NextResponse } from 'next/server'
import { checkAllCerts, readDomains, writeDomains } from '@/lib/ssl'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const certs = await checkAllCerts()
  return NextResponse.json(certs)
}

export async function POST(req: NextRequest) {
  const { domain } = (await req.json()) as { domain?: string }
  if (!domain || typeof domain !== 'string') {
    return NextResponse.json({ error: 'domain required' }, { status: 400 })
  }
  const hostname = domain.trim().toLowerCase().replace(/^https?:\/\//, '')
  const domains = readDomains()
  if (!domains.includes(hostname)) {
    writeDomains([...domains, hostname])
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const { domain } = (await req.json()) as { domain?: string }
  if (!domain) return NextResponse.json({ error: 'domain required' }, { status: 400 })
  writeDomains(readDomains().filter((d) => d !== domain))
  return NextResponse.json({ ok: true })
}
