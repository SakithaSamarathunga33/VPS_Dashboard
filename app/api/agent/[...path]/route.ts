import { NextRequest, NextResponse } from 'next/server'

const AGENT_URL = process.env.AGENT_URL || 'http://vps-agent:4000'
const AGENT_TOKEN = process.env.AGENT_TOKEN || ''

function agentHeaders(): HeadersInit {
  return AGENT_TOKEN ? { Authorization: `Bearer ${AGENT_TOKEN}` } : {}
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join('/')
  const search = request.nextUrl.search

  const response = await fetch(`${AGENT_URL}/${path}${search}`, {
    headers: agentHeaders(),
    cache: 'no-store',
  })

  const text = await response.text()
  const data = text ? JSON.parse(text) : null
  return NextResponse.json(data, { status: response.status })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join('/')

  const response = await fetch(`${AGENT_URL}/${path}`, {
    method: 'POST',
    headers: agentHeaders(),
    cache: 'no-store',
  })

  const text = await response.text()
  const data = text ? JSON.parse(text) : null
  return NextResponse.json(data, { status: response.status })
}
