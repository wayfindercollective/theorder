# Handoff → Wayfinder OS: harden the email-signature feature

Paste the block below into the Wayfinder OS Claude Code session.

---

## Task: audit and harden the email signature feature

Wayfinder OS already has a way to add email signatures. I want that feature made genuinely
solid — images working, formatting surviving real mail clients, correct sending, a copy
button for installing it in personal mail apps, and an investigation into whether we can
end up sending **two** signatures on one email.

Please start by finding the existing signature implementation (storage, editor UI, and
every outbound send path that touches it) and reporting what's actually there before
changing anything.

### 1. Images in signatures

- Support adding an image (logo/headshot) to a signature, uploaded and served from an
  always-on public HTTPS URL.
- Image `src` must be an **absolute https URL**. Relative paths, `blob:`, and `data:` URIs
  break for recipients — confirm none of those can reach a sent email.
- Set explicit `width`/`height` attributes AND inline `width`/`height` styles. Serve a 2x
  asset scaled down so it isn't blurry on retina.
- Always include meaningful `alt` text — many clients block remote images by default, so
  no critical info (name, role, contact) may exist **only** inside the image.
- Constrain max width so signatures don't blow out the layout on a phone.

### 2. Email-safe HTML

The signature markup must be table-based with inline styles only. Specifically verify:

- No flexbox/grid, no external stylesheets, no `<style>` blocks that clients strip, no web
  fonts (use a stack like `Georgia,'Times New Roman',serif`).
- Outlook strips background colours on "dark plate" style designs — either use `bgcolor`
  attributes plus a fallback, or bake the background into the image itself.
- Check behaviour in dark mode (Apple Mail / Outlook can invert colours and wreck a
  design that assumes a white background).
- Sending pipeline: confirm the signature survives whatever CSS-inliner/sanitiser/templating
  we run, isn't HTML-entity-mangled, and that quoted-printable encoding doesn't insert soft
  line breaks that corrupt long URLs.
- Multipart emails need a sane `text/plain` alternative — the signature should degrade to
  readable plain text, not vanish or dump raw markup.
- Gmail clips messages over ~102KB; keep signature HTML lean so it doesn't push threads over.

### 3. Copy button

Add a copy button so a user can install the same signature in their **own** mail app —
Gmail (web), Apple Mail (Mac + iOS), and Outlook.

- Put both flavours on the clipboard: `text/html` (rich, with the image) and `text/plain`
  (fallback). Use `ClipboardItem` with a range-select + `document.execCommand('copy')`
  fallback — the fallback path is what makes this work in mobile browsers, so it must work
  on iOS Safari and Android Chrome, not just desktop.
- Show per-client install instructions next to the button. Known quirks that MUST be in
  the copy (all confirmed the hard way on a live setup this week):
  - **iCloud.com web mail's signature box is plain-text only** and will strip the image
    every time. Tell users not to use it; use the Mail app or Gmail web instead.
  - **iOS Mail often pastes as plain text** — shake the phone immediately and tap
    "Undo Change Attributes" to restore the image/formatting. Nearly everyone hits this.
  - **Apple Mail on Mac**: must uncheck "Always match my default message font" or all
    formatting is dropped. The preview inside the Signatures pane renders badly (image may
    show as a grey box) — that's not a failure, verify by sending a test.
  - **Gmail**: the signature must be selected under "Signature defaults" AND saved with
    "Save Changes" at the bottom, or it's silently discarded.
  - **Gmail mobile app** inherits the Gmail *web* signature automatically, unless a
    "Mobile signature" is set inside the app. The Gmail **Android** app only supports a
    plain-text mobile signature — images cannot work there.
  - Pasting into a plain-text box (chat apps, iCloud) yields the plain-text fallback. That
    is correct behaviour, not a bug — say so in the UI so we don't get false bug reports.

### 4. Investigate: can one email go out with TWO signatures?

This is the main open question. If a user installs the signature in their personal mail
client *and* Wayfinder OS appends a signature server-side, a single message could carry it
twice. Please map every send path and determine where a signature is actually attached.

Things to check specifically:

- **Which layer appends?** For each outbound path (transactional sends, campaign/broadcast
  sends, replies, and anything sent through a user's connected Google/Microsoft account via
  API or SMTP relay), determine whether Wayfinder OS appends the signature, the provider
  does, or both.
- **Hypothesis to verify, not assume:** provider signatures (Gmail's web signature, iOS
  Mail's signature) are normally inserted by that provider's *compose UI*, so mail sent via
  the Gmail API/SMTP typically does **not** get Gmail's signature auto-appended. Confirm
  this empirically for our actual integration rather than trusting it — "Send mail as"
  aliases and relay configurations can behave differently.
- **Most likely real bug:** a user pastes the signature into a saved template/body in
  Wayfinder OS *and* has an account-level "append my signature" setting enabled → double.
  Check whether that combination is currently possible.
- **Suggested mitigations to evaluate:**
  - Wrap the injected signature in a sentinel (e.g. `<div class="wf-signature" data-wf-sig="1">`)
    and skip appending if the composed body already contains one.
  - A clear per-account toggle ("append my signature to emails sent from Wayfinder OS"),
    with UI copy warning that if they also set the same signature inside Gmail/Apple Mail,
    messages composed *there* will use that one — the two systems should not both be on for
    the same send path.
  - Important exception: on replies/forwards the quoted history legitimately contains older
    signatures. Dedupe logic must not strip those or mangle quoted threads.

### 5. Deliverables

1. A short written audit of what exists today and what's actually broken (don't fix before
   reporting — I want to see the findings).
2. The fixes, with tests where the code is testable.
3. A real-send verification matrix: send test emails and confirm rendering in Gmail web,
   Gmail iOS app, Apple Mail on macOS, Apple Mail on iOS, and Outlook — and confirm no
   double signature on any path.

### Reference implementation

The Order project (separate repo, `theorder`) has a working, email-safe signature generator
at `src/admin/tabs/EmailSignatureTab.jsx`: four table-based signature designs with absolute
image URLs, the dual-payload clipboard copy logic with the mobile-safe fallback, and the
per-client install instructions including all the quirks listed above. Worth reading before
building — it's been validated against a live Google Workspace + Apple Mail setup.
