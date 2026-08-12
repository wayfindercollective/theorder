import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SectionsTab } from './tabs/SectionsTab.jsx'
import { ApplicationTab } from './tabs/ApplicationTab.jsx'
import { TestimonialsTab } from './tabs/TestimonialsTab.jsx'
import { ImagesTab } from './tabs/ImagesTab.jsx'
import { LogoTab } from './tabs/LogoTab.jsx'
import { LibraryTab } from './tabs/LibraryTab.jsx'
import { EmailSignatureTab } from './tabs/EmailSignatureTab.jsx'
import { getDeployStatus, humanizeError } from './adminApi.js'
import {
  RESERVED_VARIANT_SLUGS,
  isValidVariantSlug,
  pickVariantFields,
  slugifyPageName,
} from '../config/variantFields.js'

const TABS = [
  { id: 'sections',    label: 'Sections' },
  { id: 'application', label: 'Application' },
  { id: 'testimonials', label: 'Testimonials' },
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

// djb2 over the full serialisation — length + first-64-chars collided too
// easily once variant edits pushed real differences past char 64.
function fingerprint(obj) {
  try {
    const s = JSON.stringify(obj)
    let h = 5381
    for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0
    return s.length + ':' + h.toString(36)
  } catch { return '' }
}

// Only the pieces of the draft that differ from the loaded baseline. This IS
// the save payload: each file sent is one commit and one deploy, so a
// one-word edit to one page must not re-commit sections.json, questions.json
// or any other page. A page with no baseline is a NEW page — it goes under
// `createVariants` so the server can enforce must-not-exist (two tabs adding
// the same slug cannot silently overwrite each other).
function diffPayload(content, draft) {
  const payload = {}
  if (JSON.stringify(draft.sections) !== JSON.stringify(content.sections)) payload.sections = draft.sections
  if (JSON.stringify(draft.questions) !== JSON.stringify(content.questions)) payload.questions = draft.questions
  const baseline = content.variants || {}
  const updates = {}
  const creates = {}
  for (const [slug, data] of Object.entries(draft.variants || {})) {
    if (!(slug in baseline)) creates[slug] = data
    else if (JSON.stringify(data) !== JSON.stringify(baseline[slug])) updates[slug] = data
  }
  if (Object.keys(updates).length) payload.variants = updates
  if (Object.keys(creates).length) payload.createVariants = creates
  return payload
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

// `saveTrigger` is { n, sha } — sha is the git commit the save/delete made.
// Passing it means the badge waits for THAT commit's deployment instead of
// trusting whatever deploy happens to be latest at the first poll.
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
        const r = await getDeployStatus(saveTrigger.sha || undefined)
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

export function AdminEditor({ content, loading, error, onSave, onDeleteVariant, onLogout }) {
  const [tab, setTab] = useState('sections')
  // Which page the Sections tab is editing: 'main' or a variant slug.
  const [page, setPage] = useState('main')
  const [draft, setDraft] = useState(null)
  const [saveStatus, setSaveStatus] = useState({ state: 'idle', message: '' })
  const [restorePrompt, setRestorePrompt] = useState(null) // { draft, savedAt } | null
  const [saveTrigger, setSaveTrigger] = useState(null) // { n, sha } after a save/delete
  // True while a page DELETE is in flight — the whole editor is covered by a
  // busy overlay so no edit can land before the content re-seed replaces the
  // draft (the same clobber the dirty-check guards against, but mid-request).
  const [removing, setRemoving] = useState(false)
  const baselineFpRef = useRef('')
  // Bumped on every draft edit; lets handleSave detect edits that landed while
  // the request was in flight (same guard DeckEditor uses).
  const revRef = useRef(0)
  // Set when such edits landed: the next content re-seed must keep the local
  // draft instead of clobbering it with the just-saved (older) server copy.
  const keepDraftRef = useRef(false)

  const deploy = useDeployStatus(saveTrigger)

  // Seed draft from server content. If a localStorage draft exists with a
  // matching baseline, surface a restore banner instead of silently using it.
  useEffect(() => {
    if (!content) return
    const fp = fingerprint(content)
    if (keepDraftRef.current) {
      // Edits arrived mid-save — keep them; only adopt the new baseline so the
      // still-dirty draft persists against the fresh server content.
      keepDraftRef.current = false
      baselineFpRef.current = fp
      return
    }
    baselineFpRef.current = fp
    const seeded = {
      sections: content.sections,
      questions: content.questions,
      variants: { ...(content.variants || {}) },
    }
    const stored = readDraft()
    if (stored && stored.baselineFp === fp) {
      const matches = JSON.stringify(stored.draft) === JSON.stringify(seeded)
      if (!matches) {
        setRestorePrompt({ draft: stored.draft, savedAt: stored.savedAt })
      } else {
        clearDraft()
      }
    } else if (stored) {
      // baseline drifted (someone else saved). Drop stale draft.
      clearDraft()
    }
    setDraft(seeded)
  }, [content])

  const dirty = useMemo(() => {
    if (!content || !draft) return false
    return Object.keys(diffPayload(content, draft)).length > 0
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
    if (!dirty || saveStatus.state === 'saving') return
    setSaveStatus({ state: 'saving', message: 'Saving…' })
    const revAtSave = revRef.current
    // Send only the changed files — each one is a commit and a deploy.
    const r = await onSave(diffPayload(content, draft))
    if (r.ok) {
      if (revRef.current === revAtSave) {
        clearDraft()
      } else {
        // Keystrokes landed during the request — keep the newer draft (and its
        // localStorage copy); the content re-seed effect must not replace it.
        keepDraftRef.current = true
      }
      setSaveStatus({ state: 'saved', message: 'Saved.' })
      setSaveTrigger((t) => ({ n: (t?.n || 0) + 1, sha: r.commitSha || null }))
      setTimeout(() => setSaveStatus((s) => (s.state === 'saved' ? { state: 'idle', message: '' } : s)), 4000)
    } else {
      setSaveStatus({ state: 'error', message: humanizeError({ message: r.error }) })
    }
  }, [dirty, draft, onSave, saveStatus.state])

  // Ctrl/Cmd+S saves, same as the button.
  const handleSaveRef = useRef(null)
  handleSaveRef.current = handleSave
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault()
        handleSaveRef.current?.()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const updateSections = useCallback((patch) => {
    revRef.current += 1
    setDraft((d) => ({ ...d, sections: typeof patch === 'function' ? patch(d.sections) : patch }))
  }, [])
  const updateQuestions = useCallback((patch) => {
    revRef.current += 1
    setDraft((d) => ({ ...d, questions: typeof patch === 'function' ? patch(d.questions) : patch }))
  }, [])
  const updateVariant = useCallback((slug, patch) => {
    revRef.current += 1
    setDraft((d) => ({
      ...d,
      variants: {
        ...d.variants,
        [slug]: typeof patch === 'function' ? patch(d.variants[slug]) : patch,
      },
    }))
  }, [])

  // Create a page: name it, seed it from the main copy as it stands in the
  // editor right now, switch to it. Dirty by construction — Save commits it.
  const addPage = useCallback(() => {
    if (!draft) return
    const existing = Object.keys(draft.variants || {})
    const unused = RESERVED_VARIANT_SLUGS.filter((s) => !existing.includes(s))
    const name = window.prompt(
      'Name the new page. The name becomes the web address, e.g. "primal" makes theorder.global/primal.\n' +
      (unused.length ? `Planned areas not yet built: ${unused.join(', ')}.\n` : '') +
      'Avoid names already used for campaign links.'
    )
    if (!name) return
    const slug = slugifyPageName(name)
    if (!isValidVariantSlug(slug)) {
      window.alert('That name cannot be used as a web address. Use 2 to 32 letters, numbers or hyphens.')
      return
    }
    if (existing.includes(slug)) {
      window.alert(`The page "${slug}" already exists.`)
      return
    }
    revRef.current += 1
    setDraft((d) => ({
      ...d,
      variants: { ...d.variants, [slug]: pickVariantFields(d.sections) },
    }))
    setPage(slug)
  }, [draft])

  const removePage = useCallback(async (slug) => {
    const isDraftOnly = !(content?.variants && slug in content.variants)
    if (isDraftOnly) {
      // Never committed — dropping it from the draft is the whole removal.
      if (!window.confirm(`Remove the unsaved page "${slug}"?`)) return
      revRef.current += 1
      setPage('main')
      setDraft((d) => {
        const variants = { ...d.variants }
        delete variants[slug]
        return { ...d, variants }
      })
      return
    }
    // A saved page. Deleting refreshes the baseline content, and the re-seed
    // that follows would clobber a dirty draft or orphan a pending restore —
    // so both must be settled first, and the busy overlay locks the editor
    // while the request is in flight.
    if (dirty || restorePrompt) {
      window.alert('Save or discard your changes first, then remove the page.')
      return
    }
    if (!window.confirm(
      `Remove the page "${slug}" from the site?\n` +
      `theorder.global/${slug} will show the main site instead. Old links keep working.`
    )) return
    try { document.activeElement?.blur() } catch { /* noop */ }
    setRemoving(true)
    const r = await onDeleteVariant(slug)
    setRemoving(false)
    if (r?.ok) {
      setPage('main')
      setSaveTrigger((t) => ({ n: (t?.n || 0) + 1, sha: r.commitSha || null }))
    }
  }, [content, dirty, restorePrompt, onDeleteVariant])

  const acceptRestore = useCallback(() => {
    // A restore mutates the draft like any edit — bump the rev so a save that
    // was in flight when it happened can't adopt the server copy over it.
    revRef.current += 1
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
      {removing && (
        <div className="admin-busy-overlay" role="alert" aria-busy="true">
          <p className="restraint">Removing page…</p>
        </div>
      )}
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
        {tab === 'sections'    && (() => {
          // If the selected page stopped existing (removed elsewhere), fall
          // back to the main site rather than rendering an empty draft.
          const effectivePage = page !== 'main' && draft.variants?.[page] ? page : 'main'
          return (
            <SectionsTab
              sections={effectivePage === 'main' ? draft.sections : draft.variants[effectivePage]}
              onChange={effectivePage === 'main' ? updateSections : (patch) => updateVariant(effectivePage, patch)}
              page={effectivePage}
              pages={Object.keys(draft.variants || {}).sort()}
              savedPages={Object.keys(content.variants || {})}
              onPageChange={setPage}
              onAddPage={addPage}
              onRemovePage={removePage}
            />
          )
        })()}
        {tab === 'application' && (
          <ApplicationTab
            questions={draft.questions}
            onChange={updateQuestions}
            sections={draft.sections}
            onSectionsChange={updateSections}
          />
        )}
        {tab === 'testimonials' && <TestimonialsTab sections={draft.sections} savedSections={content.sections} onChange={updateSections} />}
        {tab === 'images'      && <ImagesTab      sections={draft.sections} onChange={updateSections} />}
        {tab === 'library'     && <LibraryTab     sections={draft.sections} savedSections={content.sections} />}
        {tab === 'logo'        && <LogoTab        sections={draft.sections} onChange={updateSections} />}
        {tab === 'signature'   && <EmailSignatureTab />}
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
