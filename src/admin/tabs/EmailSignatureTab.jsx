/**
 * EmailSignatureTab — generate a branded Apple Mail signature.
 *
 * This tab is a standalone tool: it does NOT edit the CMS draft. Type a name
 * and role, see a live preview, and copy an email-safe (table + inline-style)
 * signature ready to paste into Apple Mail.
 *
 * The crest is referenced by an ABSOLUTE, public URL so it displays for every
 * recipient. If a custom brand logo has been uploaded on the Logo tab, that is
 * used instead (absolutized against the production origin).
 */

import { useRef, useState } from 'react'

const PROD_ORIGIN = 'https://www.theorder.global'
const DEFAULT_LOGO = PROD_ORIGIN + '/images/logo-mark.png'

// Turn whatever the brand logo is into a publicly reachable absolute URL.
// Relative paths get the production origin; blob:/data: (mid-upload) fall back.
function absolutizeLogo(src) {
  if (typeof src === 'string') {
    if (/^https?:\/\//i.test(src)) return src
    if (src.startsWith('/')) return PROD_ORIGIN + src
  }
  return DEFAULT_LOGO
}

export function EmailSignatureTab({ sections }) {
  const [name, setName] = useState('Nico Seedsman')
  const [role, setRole] = useState('CEO and Founder')
  const [copied, setCopied] = useState('')
  const [platform, setPlatform] = useState('mac')
  const sigRef = useRef(null)

  const logoUrl = absolutizeLogo(sections?.brand?.logo)

  const copy = async () => {
    const node = sigRef.current
    if (!node) return
    // Preferred path: select the rendered node and copy → keeps the image +
    // formatting as rich HTML, which is what Apple Mail pastes.
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
        Generate a branded Apple Mail signature. Enter a name and role, copy, then paste into
        Mail. Send a new team member to this tab and they can make their own the same way.
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
            <table
              cellPadding="0"
              cellSpacing="0"
              border="0"
              role="presentation"
              style={{ borderCollapse: 'collapse', fontFamily: "Georgia,'Times New Roman',serif" }}
            >
              <tbody>
                <tr>
                  <td style={{ verticalAlign: 'middle', padding: '0 18px 0 0', borderRight: '1px solid #d9cfb8' }}>
                    <img
                      src={logoUrl}
                      alt="The Order"
                      width="52"
                      height="107"
                      style={{ display: 'block', width: '52px', height: '107px', border: 0, outline: 'none' }}
                    />
                  </td>
                  <td style={{ verticalAlign: 'middle', padding: '0 0 0 18px' }}>
                    <div style={{ fontFamily: "Georgia,'Times New Roman',serif", fontSize: '17px', fontWeight: 'bold', color: '#1a1a1a', lineHeight: 1.2 }}>
                      {name}
                    </div>
                    <div style={{ fontFamily: "Georgia,'Times New Roman',serif", fontSize: '13px', color: '#6b6b6b', letterSpacing: '0.03em', paddingTop: '2px' }}>
                      {role}
                    </div>
                    <div style={{ fontFamily: "Georgia,'Times New Roman',serif", fontSize: '13px', fontWeight: 'bold', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#7d6635', paddingTop: '12px' }}>
                      THE&nbsp;ORDER
                    </div>
                    <div style={{ fontFamily: "Georgia,'Times New Roman',serif", fontSize: '12px', paddingTop: '3px' }}>
                      <a href="https://www.theorder.global" style={{ color: '#8a8a8a', textDecoration: 'none' }}>
                        theorder.global
                      </a>
                    </div>
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
          {copied === 'ok' && <span className="sig-status sig-status-ok">✓ Copied — now paste into Mail.</span>}
          {copied === 'fail' && <span className="sig-status sig-status-fail">Couldn’t auto-copy. Select the preview above and press ⌘C.</span>}
        </div>

        <div className="sig-tabs">
          <button type="button" className={'sig-tab' + (platform === 'mac' ? ' active' : '')} onClick={() => setPlatform('mac')}>On a Mac</button>
          <button type="button" className={'sig-tab' + (platform === 'ios' ? ' active' : '')} onClick={() => setPlatform('ios')}>On iPhone / iPad</button>
        </div>

        {platform === 'mac' ? (
          <ol className="sig-steps">
            <li>Click <b>Copy signature</b> above.</li>
            <li>Open <b>Mail</b> → menu bar → <b>Mail → Settings</b> → <b>Signatures</b> tab.</li>
            <li>Select the <b>theorder.global account</b> on the left, click <b>+</b> to add a signature, and name it “The Order”.</li>
            <li><b>Important:</b> uncheck <b>“Always match my default message font”</b> (bottom of the window) so the formatting is kept.</li>
            <li>Click into the right-hand box, select any placeholder text, and <b>paste</b> (⌘V). The logo and layout appear.</li>
            <li>At the bottom, set the <b>Choose Signature</b> dropdown to “The Order” so it’s used automatically.</li>
          </ol>
        ) : (
          <ol className="sig-steps">
            <li>Email yourself this signature: paste it into a message from a Mac, or click <b>Copy signature</b> if you opened the admin on the phone.</li>
            <li>Open that email on the phone and <b>copy</b> the signature (tap &amp; hold → Select All → Copy).</li>
            <li>Go to <b>Settings → Apps → Mail → Signature</b> (older iOS: <b>Settings → Mail → Signature</b>).</li>
            <li>Choose <b>Per Account</b>, tap the box for the theorder.global account, and <b>paste</b>. iOS keeps the logo and formatting.</li>
          </ol>
        )}

        <p className="admin-field-hint">
          The logo loads from the live site, so it always displays for the people you email.
        </p>
      </section>
    </div>
  )
}
