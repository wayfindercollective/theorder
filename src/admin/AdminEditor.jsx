import { useEffect, useMemo, useState } from 'react'
import { SectionsTab } from './tabs/SectionsTab.jsx'
import { ApplicationTab } from './tabs/ApplicationTab.jsx'
import { ImagesTab } from './tabs/ImagesTab.jsx'
import { LogoTab } from './tabs/LogoTab.jsx'

const TABS = [
  { id: 'sections',    label: 'Sections' },
  { id: 'application', label: 'Application' },
  { id: 'images',      label: 'Images' },
  { id: 'logo',        label: 'Logo' },
]

export function AdminEditor({ content, loading, error, onSave, onLogout }) {
  const [tab, setTab] = useState('sections')
  const [draft, setDraft] = useState(null)
  const [saveStatus, setSaveStatus] = useState({ state: 'idle', message: '' })

  useEffect(() => {
    if (content) setDraft({ sections: content.sections, questions: content.questions })
  }, [content])

  const dirty = useMemo(() => {
    if (!content || !draft) return false
    return JSON.stringify(content.sections) !== JSON.stringify(draft.sections)
        || JSON.stringify(content.questions) !== JSON.stringify(draft.questions)
  }, [content, draft])

  const handleSave = async () => {
    if (!dirty) return
    setSaveStatus({ state: 'saving', message: 'Saving…' })
    const r = await onSave(draft)
    if (r.ok) {
      setSaveStatus({ state: 'saved', message: 'Saved. Live in ~30 seconds.' })
      setTimeout(() => setSaveStatus({ state: 'idle', message: '' }), 6000)
    } else {
      setSaveStatus({ state: 'error', message: r.error || 'Save failed' })
    }
  }

  const updateSections = (patch) => {
    setDraft((d) => ({ ...d, sections: typeof patch === 'function' ? patch(d.sections) : patch }))
  }
  const updateQuestions = (patch) => {
    setDraft((d) => ({ ...d, questions: typeof patch === 'function' ? patch(d.questions) : patch }))
  }

  if (!content || !draft) {
    return (
      <div className="admin-loading">
        <p className="restraint">{loading ? 'Loading content…' : (error || 'Loading…')}</p>
      </div>
    )
  }

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <div className="admin-topbar-left">
          <span className="display admin-brand">The Order · Admin</span>
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
        {tab === 'logo'        && <LogoTab        sections={draft.sections} onChange={updateSections} />}
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
