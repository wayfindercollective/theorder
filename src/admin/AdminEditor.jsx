import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SectionsTab } from './tabs/SectionsTab.jsx'
import { ApplicationTab } from './tabs/ApplicationTab.jsx'
import { ImagesTab } from './tabs/ImagesTab.jsx'
import { LogoTab } from './tabs/LogoTab.jsx'
import { LibraryTab } from './tabs/LibraryTab.jsx'
import { EmailSignatureTab } from './tabs/EmailSignatureTab.jsx'
import { getDeployStatus, humanizeError } from './adminApi.js'

const TABS = [
  { id: 'sections',    label: 'Sections' },
  { id: 'application', label: 'Application' },
  { id: 'images',      label: 'Images' },
  { id: 'library',     label: 'Library' },
  { id: 'logo',        label: 'Logo' },
  { id: 'signature',   label: 'Email Signature' },
]

const DRAFT_KEY = 'order_admin_draft_v1'

// ── Draft persistence ────────────────────────────────────────────────────
//
// We mirror the in-memory draft to localStorage every change, alongside
// a fingerprint of the server content the draft is based on. On load,
// if a saved draft is found AND its baseline fingerprint matches the
// server content we just fetched, we offer to restore it. If the baseline
// no longer matches (someone else saved on top), we drop the draft so
// we don't surface stale edits as if they were against fresh content.

function fingerprint(obj) {
  try { return JSON.stringify(obj).length + ':' + JSON.stringify(obj).slice(0, 64) }
  catch { return '' }
}

function readDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch { return null }
}

function writeDraft(draft, baselineFp) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      draft,
      baselineFp,
      savedAt: new Date().toISOString(),
    }))
  } catch { /* quota; ignore */ }
}

function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY) } catch { /* noop */ }
}

// ── Deploy status polling ────────────────────────────────────────────────
//
// After a successful save, poll the deploy-status endpoint every 5s. Stop
// when we see READY, ERROR, or after MAX_POLL_MS. Falls through silently
// if the endpoint reports UNKNOWN (env vars not configured).

const POLL_INTERVAL_MS = 5000
const MAX_POLL_MS = 3 * 60 * 1000

function useDeployStatus(saveTrigger) {
  const [status, setStatus] = useState(null) // { state, url, since }
  const timerRef = useRef(null)
  const startedAtRef = useRef(0)

  useEffect(() => {
    if (!saveTrigger) return
    startedAtRef.current = Date.now()
    setStatus({ state: 'BUILDING', url: null, since: startedAtRef.current })

    let cancelled = false
    const tick = async () => {
      if (cancelled) return
      try {
        const r = await getDeployStatus()
        if (cancelled) return
        if (r.state === 'UNKNOWN') {
          setStatus(null)
          return
        }
        setStatus({ state: r.state, url: r.url, since: startedAtRef.current })
        if (r.state === 'READY' || r.state === 'ERROR' || r.state === 'CANCELED') return
      } catch {
        // network / transient — keep polling
      }
      if (Date.now() - startedAtRef.current > MAX_POLL_MS) return
      timerRef.current = setTimeout(tick, POLL_INTERVAL_MS)
    }
    timerRef.current = setTimeout(tick, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearTimeout(timerRef.current)
    }
  }, [saveTrigger])

  return status
}

export function AdminEditor({ content, loading, error, onSave, onLogout }) {
  const [tab, setTab] = useState('sections')
  const [draft, setDraft] = useState(null)
  const [saveStatus, setSaveStatus] = useState({ state: 'idle', message: '' })
  const [restorePrompt, setRestorePrompt] = useState(null) // { draft, savedAt } | null
  const [saveTrigger, setSaveTrigger] = useState(0)
  const baselineFpRef = useRef('')

  const deploy = useDeployStatus(saveTrigger)

  // Seed draft from server content. If a localStorage draft exists with a
  // matching baseline, surface a restore banner instead of silently using it.
  useEffect(() => {
    if (!content) return
    const fp = fingerprint(content)
    baselineFpRef.current = fp
    const stored = readDraft()
    if (stored && stored.baselineFp === fp) {
      const matches = JSON.stringify(stored.draft) === JSON.stringify({
        sections: content.sections, questions: content.questions,
      })
      if (!matches) {
        setRestorePrompt({ draft: stored.draft, savedAt: stored.savedAt })
      } else {
        clearDraft()
      }
    } else if (stored) {
      // baseline drifted (someone else saved). Drop stale draft.
      clearDraft()
    }
    setDraft({ sections: content.sections, questions: content.questions })
  }, [content])

  const dirty = useMemo(() => {
    if (!content || !draft) return false
    return JSON.stringify(content.sections) !== JSON.stringify(draft.sections)
        || JSON.stringify(content.questions) !== JSON.stringify(draft.questions)
  }, [content, draft])

  // Persist draft to localStorage whenever it changes and is actually dirty.
  // While a restore banner is pending, keep the durable copy even though the
  // seeded draft reads "clean" — otherwise a refresh before the client clicks
  // Restore would lose their recovered unsaved edits.
  useEffect(() => {
    if (!draft || !content) return
    if (dirty) writeDraft(draft, baselineFpRef.current)
    else if (!restorePrompt) clearDraft()
  }, [draft, dirty, content, restorePrompt])

  // beforeunload guard — block tab close / refresh while dirty.
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue = ''
      return ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  const handleSave = useCallback(async () => {
    if (!dirty) return
    setSaveStatus({ state: 'saving', message: 'Saving…' })
    const r = await onSave(draft)
    if (r.ok) {
      clearDraft()
      setSaveStatus({ state: 'saved', message: 'Saved.' })
      setSaveTrigger((n) => n + 1)
      setTimeout(() => setSaveStatus((s) => (s.state === 'saved' ? { state: 'idle', message: '' } : s)), 4000)
    } else {
      setSaveStatus({ state: 'error', message: humanizeError({ message: r.error }) })
    }
  }, [dirty, draft, onSave])

  const updateSections = useCallback((patch) => {
    setDraft((d) => ({ ...d, sections: typeof patch === 'function' ? patch(d.sections) : patch }))
  }, [])
  const updateQuestions = useCallback((patch) => {
    setDraft((d) => ({ ...d, questions: typeof patch === 'function' ? patch(d.questions) : patch }))
  }, [])

  const acceptRestore = useCallback(() => {
    if (restorePrompt?.draft) setDraft(restorePrompt.draft)
    setRestorePrompt(null)
  }, [restorePrompt])

  const discardRestore = useCallback(() => {
    clearDraft()
    setRestorePrompt(null)
  }, [])

  if (!content || !draft) {
    return (
      <div className="admin-loading">
        <p className="restraint">{loading ? 'Loading content…' : (humanizeError({ message: error }) || 'Loading…')}</p>
      </div>
    )
  }

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <div className="admin-topbar-left">
          <span className="display admin-brand">The Order · Admin</span>
          <DeployBadge deploy={deploy} saveStatus={saveStatus} dirty={dirty} />
        </div>
        <div className="admin-topbar-right">
          {saveStatus.message && (
            <span className={'admin-save-status admin-save-' + saveStatus.state}>
              {saveStatus.message}
            </span>
          )}
          <button
            className="btn btn-primary admin-save-btn"
            onClick={handleSave}
            disabled={!dirty || loading || saveStatus.state === 'saving'}
            type="button"
          >
            {saveStatus.state === 'saving' ? 'Saving…' : dirty ? 'Save Changes' : 'Saved'}
          </button>
          <button className="btn btn-ghost admin-logout" onClick={onLogout} type="button">Sign out</button>
        </div>
      </header>

      {restorePrompt && (
        <div className="admin-restore-banner">
          <span>
            You have unsaved edits from <strong>{new Date(restorePrompt.savedAt).toLocaleString()}</strong>.
          </span>
          <div className="admin-restore-actions">
            <button type="button" className="btn btn-primary" onClick={acceptRestore}>Restore</button>
            <button type="button" className="btn btn-ghost" onClick={discardRestore}>Discard</button>
          </div>
        </div>
      )}

      <nav className="admin-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={'admin-tab' + (t.id === tab ? ' active' : '')}
            onClick={() => setTab(t.id)}
            type="button"
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="admin-tab-body">
        {tab === 'sections'    && <SectionsTab    sections={draft.sections} onChange={updateSections} />}
        {tab === 'application' && <ApplicationTab questions={draft.questions} onChange={updateQuestions} />}
        {tab === 'images'      && <ImagesTab      sections={draft.sections} onChange={updateSections} />}
        {tab === 'library'     && <LibraryTab     sections={draft.sections} />}
        {tab === 'logo'        && <LogoTab        sections={draft.sections} onChange={updateSections} />}
        {tab === 'signature'   && <EmailSignatureTab sections={draft.sections} />}
      </main>

      {dirty && (
        <div className="admin-floating-save">
          <span className="restraint">You have unsaved changes</span>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={loading || saveStatus.state === 'saving'}
            type="button"
          >
            {saveStatus.state === 'saving' ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  )
}

function DeployBadge({ deploy, saveStatus, dirty }) {
  // Surface "Building… / Live" only when we have a real signal.
  if (dirty || saveStatus.state === 'saving') return null
  if (!deploy) return null
  const state = deploy.state
  if (state === 'READY') {
    return <span className="admin-deploy-badge admin-deploy-ready">● Live</span>
  }
  if (state === 'ERROR' || state === 'CANCELED') {
    return <span className="admin-deploy-badge admin-deploy-error">● Build failed</span>
  }
  // BUILDING / QUEUED / INITIALIZING
  const elapsed = Math.round((Date.now() - (deploy.since || Date.now())) / 1000)
  return <span className="admin-deploy-badge admin-deploy-building">● Building… {elapsed}s</span>
}
