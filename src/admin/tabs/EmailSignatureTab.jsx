/**
 * EmailSignatureTab — generate a branded email signature.
 *
 * This tab is a standalone tool: it does NOT edit the CMS draft. Type a name
 * and role, see a live preview, and copy an email-safe (table + inline-style)
 * signature ready to paste into Apple Mail, Gmail, Outlook, etc.
 *
 * Layout: a horizontal "crest + THE ORDER" lockup on the left, then the
 * person's name / role / website to the right. The lockup is a pre-rendered
 * PNG (real Cinzel wordmark) served from the live site, so it displays
 * identically for every recipient and in every client — no web fonts needed.
 */

import { useRef, useState } from 'react'

const LOCKUP_URL = 'https://www.theorder.global/images/signature-lockup-dark.png'
const SERIF = "Georgia,'Times New Roman',serif"

export function EmailSignatureTab() {
  const [name, setName] = useState('Nico Seedsman')
  const [role, setRole] = useState('CEO and Founder')
  const [copied, setCopied] = useState('')
  const [platform, setPlatform] = useState('mac')
  const sigRef = useRef(null)

  const copy = async () => {
    const node = sigRef.current
    if (!node) return
    // Preferred path: select the rendered node and copy → keeps the image +
    // formatting as rich HTML, which is what mail clients paste.
    try {
      const range = document.createRange()
      range.selectNode(node)
      const sel = window.getSelection()
      sel.removeAllRanges()
      sel.addRange(range)
      const ok = document.execCommand('copy')
      sel.removeAllRanges()
      if (ok) { setCopied('ok'); return }
    } catch { /* fall through */ }

    // Fallback: modern clipboard API with explicit HTML payload.
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        const item = new window.ClipboardItem({
          'text/html': new Blob([node.innerHTML], { type: 'text/html' }),
          'text/plain': new Blob([node.innerText], { type: 'text/plain' }),
        })
        await navigator.clipboard.write([item])
        setCopied('ok')
        return
      }
    } catch { /* fall through */ }
    setCopied('fail')
  }

  return (
    <div className="admin-tab-pane">
      <p className="restraint admin-tab-intro">
        Generate a branded email signature for Apple Mail, Gmail, Outlook — anything. Enter a name
        and role, copy, then paste into your mail settings. Send a new team member to this tab and
        they can make their own the same way.
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
              onChange={(e) => { setName(e.target.value); setCopied('') }}
            />
          </label>
          <label className="admin-field">
            <span className="admin-field-label">Role</span>
            <input
              className="input-field"
              type="text"
              value={role}
              onChange={(e) => { setRole(e.target.value); setCopied('') }}
            />
          </label>
        </div>
      </section>

      {/* 2 — preview */}
      <section className="admin-section-block">
        <h2 className="admin-section-title display">Preview</h2>
        <div className="sig-email-frame">
          {/* This exact node gets copied. Email-safe: table + inline styles. */}
          <div ref={sigRef}>
            <table cellPadding="0" cellSpacing="0" border="0" role="presentation" style={{ borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td bgcolor="#0a0908" style={{ backgroundColor: '#0a0908', padding: '18px 24px', borderRadius: '8px' }}>
                    <table cellPadding="0" cellSpacing="0" border="0" role="presentation" style={{ borderCollapse: 'collapse', fontFamily: SERIF }}>
                      <tbody>
                        <tr>
                          <td style={{ verticalAlign: 'middle', padding: '0 22px 0 0' }}>
                            <img
                              src={LOCKUP_URL}
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
                              <a href="https://www.theorder.global" style={{ color: '#c4a45f', textDecoration: 'none' }}>
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
          </div>
        </div>
      </section>

      {/* 3 — copy + install */}
      <section className="admin-section-block">
        <h2 className="admin-section-title display">Copy &amp; install</h2>
        <div className="sig-copy-row">
          <button type="button" className="btn btn-primary" onClick={copy}>Copy signature</button>
          {copied === 'ok' && <span className="sig-status sig-status-ok">✓ Copied — now paste into your mail settings.</span>}
          {copied === 'fail' && <span className="sig-status sig-status-fail">Couldn’t auto-copy. Select the preview above and press ⌘C / Ctrl+C.</span>}
        </div>

        <div className="sig-tabs">
          <button type="button" className={'sig-tab' + (platform === 'mac' ? ' active' : '')} onClick={() => setPlatform('mac')}>Apple Mail (Mac)</button>
          <button type="button" className={'sig-tab' + (platform === 'gmail' ? ' active' : '')} onClick={() => setPlatform('gmail')}>Gmail</button>
          <button type="button" className={'sig-tab' + (platform === 'ios' ? ' active' : '')} onClick={() => setPlatform('ios')}>iPhone / iPad</button>
        </div>

        {platform === 'mac' && (
          <ol className="sig-steps">
            <li>Click <b>Copy signature</b> above.</li>
            <li>Open <b>Mail</b> → menu bar → <b>Mail → Settings</b> → <b>Signatures</b> tab.</li>
            <li>Select the <b>theorder.global account</b> on the left, click <b>+</b> to add a signature, and name it “The Order”.</li>
            <li><b>Important:</b> uncheck <b>“Always match my default message font”</b> (bottom of the window) so the formatting is kept.</li>
            <li>Click into the right-hand box, select any placeholder text, and <b>paste</b> (⌘V). The lockup and details appear.</li>
            <li>At the bottom, set the <b>Choose Signature</b> dropdown to “The Order” so it’s used automatically.</li>
          </ol>
        )}

        {platform === 'gmail' && (
          <ol className="sig-steps">
            <li>Click <b>Copy signature</b> above.</li>
            <li>In Gmail, open <b>Settings</b> (gear icon) → <b>See all settings</b> → <b>General</b> tab.</li>
            <li>Scroll to <b>Signature</b> → <b>Create new</b>, name it “The Order”.</li>
            <li>Click into the signature box and <b>paste</b> (⌘V / Ctrl+V) — the lockup and details come through.</li>
            <li>Under <b>Signature defaults</b>, set it for new emails (and replies if you want), then <b>Save Changes</b> at the bottom.</li>
          </ol>
        )}

        {platform === 'ios' && (
          <ol className="sig-steps">
            <li>Email yourself this signature: paste it into a message from a Mac/Gmail, or click <b>Copy signature</b> if you opened the admin on the phone.</li>
            <li>Open that email on the phone and <b>copy</b> the signature (tap &amp; hold → Select All → Copy).</li>
            <li>Go to <b>Settings → Apps → Mail → Signature</b> (older iOS: <b>Settings → Mail → Signature</b>).</li>
            <li>Choose <b>Per Account</b>, tap the box for the theorder.global account, and <b>paste</b>. iOS keeps the lockup and formatting.</li>
          </ol>
        )}

        <p className="admin-field-hint">
          The lockup loads from the live site, so it always displays for the people you email.
        </p>
      </section>
    </div>
  )
}
