import * as tls from 'tls'
import * as fs from 'fs'
import * as path from 'path'

const DOMAINS_FILE = path.join(process.cwd(), 'data', 'ssl-domains.json')

export interface SSLCertInfo {
  domain: string
  issuer: string
  validTo: string
  daysRemaining: number
  status: 'ok' | 'warning' | 'expired' | 'error'
  error?: string
}

export function readDomains(): string[] {
  try {
    if (!fs.existsSync(DOMAINS_FILE)) return []
    return JSON.parse(fs.readFileSync(DOMAINS_FILE, 'utf-8')) as string[]
  } catch {
    return []
  }
}

export function writeDomains(domains: string[]): void {
  const dir = path.dirname(DOMAINS_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(DOMAINS_FILE, JSON.stringify(Array.from(new Set(domains)), null, 2))
}

function checkCert(hostname: string, port = 443): Promise<SSLCertInfo> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      socket.destroy()
      resolve({ domain: hostname, issuer: '—', validTo: '—', daysRemaining: -1, status: 'error', error: 'timeout' })
    }, 8000)

    const socket = tls.connect(
      { host: hostname, port, servername: hostname, rejectUnauthorized: false },
      () => {
        clearTimeout(timeout)
        const cert = socket.getPeerCertificate()
        socket.destroy()

        if (!cert || !cert.valid_to) {
          resolve({ domain: hostname, issuer: '—', validTo: '—', daysRemaining: -1, status: 'error', error: 'no cert' })
          return
        }

        const validTo = new Date(cert.valid_to)
        const daysRemaining = Math.floor((validTo.getTime() - Date.now()) / 86_400_000)
        const issuer = (cert.issuer as Record<string, string>)?.O ?? '—'

        resolve({
          domain: hostname,
          issuer,
          validTo: validTo.toISOString().split('T')[0],
          daysRemaining,
          status: daysRemaining < 0 ? 'expired' : daysRemaining < 14 ? 'warning' : 'ok',
        })
      }
    )

    socket.on('error', (err) => {
      clearTimeout(timeout)
      resolve({ domain: hostname, issuer: '—', validTo: '—', daysRemaining: -1, status: 'error', error: err.message })
    })
  })
}

export async function checkAllCerts(): Promise<SSLCertInfo[]> {
  const domains = readDomains()
  if (!domains.length) return []
  return Promise.all(domains.map((d) => checkCert(d)))
}
