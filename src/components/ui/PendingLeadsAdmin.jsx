import { useState } from 'react'
import { listPendingLeads, removePendingLead } from '../../lib/pendingLeads.js'
import { retryPendingLead } from '../../lib/submitLead.js'

/**
 * Incident-recovery page at /?admin=pending-leads.
 * Unauthenticated by design — it only reads the visitor's own localStorage,
 * which is by definition leads they submitted from this browser. Not linked
 * from the visible UI.
 */
export function PendingLeadsAdmin() {
  const [leads, setLeads] = useState(() => listPendingLeads())
  const [busy, setBusy] = useState(false)
  const refresh = () => setLeads(listPendingLeads())

  const fireOne = async (rec) => {
    setBusy(true)
    await retryPendingLead(rec)
    refresh()
    setBusy(false)
  }

  const fireAll = async () => {
    setBusy(true)
    for (const rec of listPendingLeads()) {
      await retryPendingLead(rec)
      await new Promise((r) => setTimeout(r, 200))
    }
    refresh()
    setBusy(false)
  }

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(leads, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'order-pending-leads.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const clearAll = () => {
    if (!window.confirm('Delete all locally-queued leads? This cannot be undone.')) return
    leads.forEach((l) => removePendingLead(l.pendingId))
    refresh()
  }

  const box = { fontFamily: 'monospace', maxWidth: 760, margin: '40px auto', padding: 24, color: '#e8e3d8', background: '#14110d', minHeight: '100vh' }
  const btn = { marginRight: 8, padding: '6px 12px', cursor: 'pointer' }

  return (
    <div style={box}>
      <h1 style={{ fontSize: 18 }}>The Order — pending leads ({leads.length})</h1>
      <p style={{ opacity: 0.7, fontSize: 13 }}>
        Leads queued in this browser that have not confirmed delivery to Wayfinder. Re-fire to retry now.
      </p>
      <div style={{ margin: '16px 0' }}>
        <button style={btn} onClick={fireAll} disabled={busy || !leads.length}>Re-fire all</button>
        <button style={btn} onClick={exportJson} disabled={!leads.length}>Export JSON</button>
        <button style={btn} onClick={clearAll} disabled={!leads.length}>Clear all</button>
        <button style={btn} onClick={refresh} disabled={busy}>Refresh</button>
      </div>
      {!leads.length && <p>No pending leads. ✓</p>}
      {leads.map((l) => (
        <div key={l.pendingId} style={{ borderTop: '1px solid #3a342a', padding: '12px 0', fontSize: 13 }}>
          <div><strong>{l.payload?.email || '(no email)'}</strong> — {l.payload?.name || ''}</div>
          <div style={{ opacity: 0.7 }}>id: {l.pendingId}</div>
          <div style={{ opacity: 0.7 }}>retries: {l.retryCount || 0} · saved: {l.savedAt ? new Date(l.savedAt).toLocaleString() : '—'}</div>
          {l.lastError && <div style={{ color: '#c98' }}>last error: {l.lastError}</div>}
          <button style={{ ...btn, marginTop: 8 }} onClick={() => fireOne(l)} disabled={busy}>Re-fire this lead</button>
        </div>
      ))}
    </div>
  )
}
