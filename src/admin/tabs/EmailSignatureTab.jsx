/**
 * EmailSignatureTab — generate a branded email signature.
 *
 * This tab is a standalone tool: it does NOT edit the CMS draft. Type a name
 * and role, see live previews of ALL FOUR signature designs we've made
 * (oldest first), and copy whichever one you want as email-safe rich HTML
 * (table + inline styles) ready to paste into Apple Mail, Gmail, Outlook, etc.
 *
 * The four designs, in the order they were created:
 *   1. Crest            — tall crest + gold "THE ORDER" wordmark, dark text.
 *   2. Horizontal lockup — wide crest+wordmark image, divider, dark text.
 *   3. Dark plate       — everything on a black plate with cream text. The
 *                          most dramatic, but Outlook can strip the background.
 *   4. Badge (current)  — self-contained dark badge PNG + dark text. Because
 *                          the badge carries its own background, nothing
 *                          depends on the email keeping a bg colour, so it
 *                          can't be "stripped into invisibility".
 *
 * All images load from the live site so they display for every recipient.
 */

import { useRef, useState } from 'react'

const ORIGIN = 'https://www.theorder.global'
const SERIF = "Georgia,'Times New Roman',serif"

const VERSIONS = [
  {
    key: 'crest',
    title: 'Version 1 · Crest — the original',
    desc: 'The first design — tall crest with the gold “THE ORDER” wordmark in the text. This is the one Nico uses.',
  },
  {
    key: 'lockup',
    title: 'Version 2 · Horizontal lockup',
    desc: 'Wide crest-and-wordmark image with a divider line and dark text.',
  },
  {
    key: 'plate',
    title: 'Version 3 · Dark plate',
    desc: 'The full black plate with cream text — the most dramatic. Note: Outlook can strip the black background, which is why Version 4 exists.',
  },
  {
    key: 'badge',
    title: 'Version 4 · Badge (current)',
    desc: 'Self-contained dark badge plus dark text — the safest across every mail app.',
  },
]

/* The four signature bodies. Each is the exact email-safe markup of that
   design generation: tables + inline styles only, images by absolute URL. */

function CrestSignature({ name, role }) {
  return (
    <table cellPadding="0" cellSpacing="0" border="0" role="presentation" style={{ borderCollapse: 'collapse', fontFamily: SERIF }}>
      <tbody>
        <tr>
          <td style={{ verticalAlign: 'middle', padding: '0 18px 0 0', borderRight: '1px solid #d9cfb8' }}>
            <img
              src={ORIGIN + '/images/logo-mark.png'}
              alt="The Order"
              width="52"
              height="107"
              style={{ display: 'block', width: '52px', height: '107px', border: 0, outline: 'none' }}
            />
          </td>
          <td style={{ verticalAlign: 'middle', padding: '0 0 0 18px' }}>
            <div style={{ fontFamily: SERIF, fontSize: '17px', fontWeight: 'bold', color: '#1a1a1a', lineHeight: 1.2 }}>
              {name}
            </div>
            <div style={{ fontFamily: SERIF, fontSize: '13px', color: '#6b6b6b', letterSpacing: '0.03em', paddingTop: '2px' }}>
              {role}
            </div>
            <div style={{ fontFamily: SERIF, fontSize: '13px', fontWeight: 'bold', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#7d6635', paddingTop: '12px' }}>
              THE&nbsp;ORDER
            </div>
            <div style={{ fontFamily: SERIF, fontSize: '12px', paddingTop: '3px' }}>
              <a href={ORIGIN} style={{ color: '#8a8a8a', textDecoration: 'none' }}>
                theorder.global
              </a>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  )
}

function LockupSignature({ name, role }) {
  return (
    <table cellPadding="0" cellSpacing="0" border="0" role="presentation" style={{ borderCollapse: 'collapse', fontFamily: SERIF }}>
      <tbody>
        <tr>
          <td style={{ verticalAlign: 'middle', padding: '0 20px 0 0', borderRight: '1px solid #d9cfb8' }}>
            <img
              src={ORIGIN + '/images/signature-lockup.png'}
              alt="The Order"
              width="226"
              height="55"
              style={{ display: 'block', width: '226px', height: '55px', border: 0, outline: 'none' }}
            />
          </td>
          <td style={{ verticalAlign: 'middle', padding: '0 0 0 20px' }}>
            <div style={{ fontFamily: SERIF, fontSize: '18px', fontWeight: 'bold', color: '#1a1a1a', lineHeight: 1.2 }}>
              {name}
            </div>
            <div style={{ fontFamily: SERIF, fontSize: '13px', color: '#6b6b6b', letterSpacing: '0.03em', paddingTop: '3px' }}>
              {role}
            </div>
            <div style={{ fontFamily: SERIF, fontSize: '12px', paddingTop: '8px' }}>
              <a href={ORIGIN} style={{ color: '#7d6635', textDecoration: 'none' }}>
                theorder.global
              </a>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  )
}

function PlateSignature({ name, role }) {
  return (
    <table cellPadding="0" cellSpacing="0" border="0" role="presentation" style={{ borderCollapse: 'collapse' }}>
      <tbody>
        <tr>
          <td bgcolor="#0a0908" style={{ backgroundColor: '#0a0908', padding: '18px 24px', borderRadius: '8px' }}>
            <table cellPadding="0" cellSpacing="0" border="0" role="presentation" style={{ borderCollapse: 'collapse', fontFamily: SERIF }}>
              <tbody>
                <tr>
                  <td style={{ verticalAlign: 'middle', padding: '0 22px 0 0' }}>
                    <img
                      src={ORIGIN + '/images/signature-lockup-dark.png'}
                      alt="The Order"
                      width="226"
                      height="55"
                      style={{ display: 'block', width: '226px', height: '55px', border: 0, outline: 'none', msInterpolationMode: 'bicubic' }}
                    />
                  </td>
                  <td style={{ width: '1px', backgroundColor: '#4a3f2e', fontSize: '1px', lineHeight: '1px' }}>{' '}</td>
                  <td style={{ verticalAlign: 'middle', padding: '0 0 0 22px' }}>
                    <div style={{ fontFamily: SERIF, fontSize: '18px', fontWeight: 'bold', color: '#f2ead8', lineHeight: 1.2 }}>
                      {name}
                    </div>
                    <div style={{ fontFamily: SERIF, fontSize: '13px', color: '#c2b9a6', letterSpacing: '0.03em', paddingTop: '3px' }}>
                      {role}
                    </div>
                    <div style={{ fontFamily: SERIF, fontSize: '12px', paddingTop: '8px' }}>
                      <a href={ORIGIN} style={{ color: '#c4a45f', textDecoration: 'none' }}>
                        theorder.global
                      </a>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  )
}

function BadgeSignature({ name, role }) {
  return (
    <table cellPadding="0" cellSpacing="0" border="0" role="presentation" style={{ borderCollapse: 'collapse', fontFamily: SERIF }}>
      <tbody>
        <tr>
          <td style={{ verticalAlign: 'middle', padding: '0 22px 0 0' }}>
            <img
              src={ORIGIN + '/images/signature-badge.png'}
              alt="The Order"
              width="262"
              height="83"
              style={{ display: 'block', width: '262px', height: '83px', border: 0, outline: 'none', msInterpolationMode: 'bicubic' }}
            />
          </td>
          <td style={{ verticalAlign: 'middle' }}>
            <div style={{ fontFamily: SERIF, fontSize: '18px', fontWeight: 'bold', color: '#1a1a1a', lineHeight: 1.2 }}>
              {name}
            </div>
            <div style={{ fontFamily: SERIF, fontSize: '13px', color: '#4a4a4a', letterSpacing: '0.03em', paddingTop: '3px' }}>
              {role}
            </div>
            <div style={{ fontFamily: SERIF, fontSize: '12px', paddingTop: '8px' }}>
              <a href={ORIGIN} style={{ color: '#7d6635', textDecoration: 'none' }}>
                theorder.global
              </a>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  )
}

const BODIES = {
  crest: CrestSignature,
  lockup: LockupSignature,
  plate: PlateSignature,
  badge: BadgeSignature,
}

export function EmailSignatureTab() {
  const [name, setName] = useState('Nico Seedsman')
  const [role, setRole] = useState('CEO and Founder')
  const [signoff, setSignoff] = useState('God Wills It,')
  const [copied, setCopied] = useState({}) // { [versionKey]: 'ok' | 'fail' }
  const [platform, setPlatform] = useState('mac')
  const sigRefs = useRef({})

  // "God Wills It, / Nico" above the block — part of the signature so one
  // paste reproduces the whole thing. First name comes from the Name field.
  const firstName = name.trim().split(/\s+/)[0] || ''

  const copy = async (key) => {
    const node = sigRefs.current[key]
    if (!node) return
    // Preferred path: select the rendered node and copy → keeps the image +
    // formatting as rich HTML, which is what mail clients paste. This also
    // works in iOS/Android browsers, so the tab is usable straight from a phone.
    try {
      const range = document.createRange()
      range.selectNode(node)
      const sel = window.getSelection()
      sel.removeAllRanges()
      sel.addRange(range)
      const ok = document.execCommand('copy')
      sel.removeAllRanges()
      if (ok) { setCopied({ [key]: 'ok' }); return }
    } catch { /* fall through */ }

    // Fallback: modern clipboard API with explicit HTML payload.
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        const item = new window.ClipboardItem({
          'text/html': new Blob([node.innerHTML], { type: 'text/html' }),
          'text/plain': new Blob([node.innerText], { type: 'text/plain' }),
        })
        await navigator.clipboard.write([item])
        setCopied({ [key]: 'ok' })
        return
      }
    } catch { /* fall through */ }
    setCopied({ [key]: 'fail' })
  }

  return (
    <div className="admin-tab-pane">
      <p className="restraint admin-tab-intro">
        Generate a branded email signature for Apple Mail, Gmail, Outlook — anything. Enter a name
        and role once — all four designs below update. Copy the one you want, then paste it into
        your mail settings. Send a new team member to this tab and they can make their own the
        same way.
      </p>

      {/* 1 — details */}
      <section className="admin-section-block">
        <h2 className="admin-section-title display">Details</h2>
        <div className="admin-fields">
          <label className="admin-field">
            <span className="admin-field-label">Name</span>
            <input
              className="input-field"
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setCopied({}) }}
            />
          </label>
          <label className="admin-field">
            <span className="admin-field-label">Role</span>
            <input
              className="input-field"
              type="text"
              value={role}
              onChange={(e) => { setRole(e.target.value); setCopied({}) }}
            />
          </label>
          <label className="admin-field">
            <span className="admin-field-label">Sign-off (optional — appears above the signature)</span>
            <input
              className="input-field"
              type="text"
              value={signoff}
              onChange={(e) => { setSignoff(e.target.value); setCopied({}) }}
            />
          </label>
        </div>
      </section>

      {/* 2 — the four signature designs, oldest first */}
      {VERSIONS.map(({ key, title, desc }) => {
        const Body = BODIES[key]
        return (
          <section className="admin-section-block" key={key}>
            <h2 className="admin-section-title display">{title}</h2>
            <p className="admin-field-hint sig-version-desc">{desc}</p>
            <div className="sig-email-frame">
              {/* This exact node gets copied. Email-safe: table + inline styles. */}
              <div ref={(el) => { sigRefs.current[key] = el }}>
                {signoff.trim() !== '' && (
                  <div style={{ fontFamily: SERIF, fontSize: '14px', color: '#1a1a1a', lineHeight: 1.5, margin: '0 0 18px' }}>
                    {signoff}
                    <br />
                    {firstName}
                  </div>
                )}
                <Body name={name} role={role} />
              </div>
            </div>
            <div className="sig-copy-row sig-version-copy">
              <button type="button" className="btn btn-primary" onClick={() => copy(key)}>
                Copy this signature
              </button>
              {copied[key] === 'ok' && <span className="sig-status sig-status-ok">✓ Copied — now paste into your mail settings.</span>}
              {copied[key] === 'fail' && <span className="sig-status sig-status-fail">Couldn’t auto-copy. Select the preview above and press ⌘C / Ctrl+C.</span>}
            </div>
          </section>
        )
      })}

      {/* 3 — install instructions */}
      <section className="admin-section-block">
        <h2 className="admin-section-title display">Install</h2>

        <div className="sig-tabs">
          <button type="button" className={'sig-tab' + (platform === 'mac' ? ' active' : '')} onClick={() => setPlatform('mac')}>Apple Mail (Mac)</button>
          <button type="button" className={'sig-tab' + (platform === 'gmail' ? ' active' : '')} onClick={() => setPlatform('gmail')}>Gmail</button>
          <button type="button" className={'sig-tab' + (platform === 'ios' ? ' active' : '')} onClick={() => setPlatform('ios')}>iPhone / iPad</button>
        </div>

        {platform === 'mac' && (
          <ol className="sig-steps">
            <li>Copy the design you want above.</li>
            <li>Open <b>Mail</b> → menu bar → <b>Mail → Settings</b> → <b>Signatures</b> tab.</li>
            <li>Select the <b>theorder.global account</b> on the left, click <b>+</b> to add a signature, and name it “The Order”.</li>
            <li><b>Important:</b> uncheck <b>“Always match my default message font”</b> (bottom of the window) so the formatting is kept.</li>
            <li>Click into the right-hand box, select any placeholder text, and <b>paste</b> (⌘V). The logo and details appear.</li>
            <li>At the bottom, set the <b>Choose Signature</b> dropdown to “The Order” so it’s used automatically.</li>
          </ol>
        )}

        {platform === 'gmail' && (
          <ol className="sig-steps">
            <li>Copy the design you want above.</li>
            <li>In Gmail, open <b>Settings</b> (gear icon) → <b>See all settings</b> → <b>General</b> tab.</li>
            <li>Scroll to <b>Signature</b> → <b>Create new</b>, name it “The Order”.</li>
            <li>Click into the signature box and <b>paste</b> (⌘V / Ctrl+V) — the logo and details come through.</li>
            <li>Under <b>Signature defaults</b>, set it for new emails (and replies if you want), then <b>Save Changes</b> at the bottom.</li>
            <li><b>Gmail app on your phone:</b> it uses this same web signature automatically — just make sure no “Mobile signature” is set in the app (Gmail app → Settings → your account → Signature settings → off).</li>
          </ol>
        )}

        {platform === 'ios' && (
          <ol className="sig-steps">
            <li>Open this tab on the phone and tap <b>Copy this signature</b> under the design you want — or email yourself the signature from a Mac/Gmail and copy it out of that email (tap &amp; hold → Select All → Copy).</li>
            <li>Go to <b>Settings → Apps → Mail → Signature</b> (older iOS: <b>Settings → Mail → Signature</b>).</li>
            <li>Choose <b>Per Account</b>, tap the box for the theorder.global account, and <b>paste</b>.</li>
            <li><b>If it pastes as plain text:</b> shake the phone right away and tap <b>“Undo Change Attributes”</b> — that restores the logo and formatting. This quirk catches nearly everyone.</li>
          </ol>
        )}

        <p className="admin-field-hint">
          <b>Don’t paste into iCloud.com web mail</b> — its signature box is plain-text only and
          strips the logo no matter what. Paste into the <b>Mail app</b> on Mac/iPhone or
          <b> Gmail on the web</b> instead; both keep the formatting.
        </p>
        <p className="admin-field-hint">
          Every design’s images load from the live site, so they always display for the people you
          email. Heads-up on Version 3: some versions of Outlook strip its black background —
          Version 4 was built to be immune to that.
        </p>
      </section>
    </div>
  )
}
