'use client'

import { useCallback, useEffect, useState } from 'react'
import type { SSLCertInfo } from '@/lib/ssl'

export function useSSLCerts() {
  const [certs, setCerts] = useState<SSLCertInfo[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ssl')
      if (res.ok) setCerts(await res.json() as SSLCertInfo[])
    } finally {
      setLoading(false)
    }
  }, [])

  const addDomain = useCallback(async (domain: string) => {
    await fetch('/api/ssl', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain }) })
    await refresh()
  }, [refresh])

  const removeDomain = useCallback(async (domain: string) => {
    await fetch('/api/ssl', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain }) })
    setCerts((c) => c.filter((x) => x.domain !== domain))
  }, [])

  useEffect(() => {
    void refresh()
    const id = setInterval(() => void refresh(), 60_000)
    return () => clearInterval(id)
  }, [refresh])

  return { certs, loading, refresh, addDomain, removeDomain }
}
