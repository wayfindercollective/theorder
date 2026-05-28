import { useEffect } from 'react'
import { listPendingLeads } from '../lib/pendingLeads.js'
import { retryPendingLead } from '../lib/submitLead.js'

export function usePendingLeadsSync() {
  useEffect(() => {
    let cancelled = false

    async function flush() {
      const queue = listPendingLeads()
      for (const rec of queue) {
        if (cancelled) return
        await retryPendingLead(rec)
      }
    }

    flush()
    const onOnline = () => flush()
    const onFocus = () => flush()
    window.addEventListener('online', onOnline)
    window.addEventListener('focus', onFocus)
    return () => {
      cancelled = true
      window.removeEventListener('online', onOnline)
      window.removeEventListener('focus', onFocus)
    }
  }, [])
}
