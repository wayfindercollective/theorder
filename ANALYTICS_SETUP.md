# Analytics & Ad Tracking — activation guide

The code is already wired. Every tool below is **off by default** and turns on
the instant you paste its ID into a Vercel env var and redeploy — no code change.

All three ride the same event stream already flowing through the funnel
(`session_start`, `form_started`, `question_viewed`, `form_submitted`, …), so
whichever you switch on backfills with the full set of events immediately.

Wiring lives in [`src/lib/analytics.js`](src/lib/analytics.js).

---

## The three tools (and who owns what)

| Tool | Env var | What it's for | Where the ID comes from |
|------|---------|---------------|-------------------------|
| **PostHog** | `VITE_POSTHOG_KEY` | Our funnel analytics | Wayfinder's PostHog project |
| **Google Analytics 4** | `VITE_GA4_MEASUREMENT_ID` | Neutral baseline the agency reads | **Nico's Google account** |
| **Meta Pixel** | `VITE_META_PIXEL_ID` | Feeds conversions back to Meta so ads optimize; powers retargeting | **Meta Business Manager** |

### Does Nico need a Google account? Is the Pixel from the FB person?

- **GA4 is Google's, not the ad agency's.** Someone with a Google account
  creates the property and reads off the Measurement ID. Nico already has one
  (his Workspace: `nico@theorder.global`). **Create the GA4 property under
  Nico's account**, then add the agency as a user. Don't let the agency create
  it in *their* account — if you part ways, they keep your data.
- **The Meta Pixel comes from the Meta Business Manager**, which the ad account
  setup spins up. Create it inside **Nico's** Business Manager (the agency can
  do this for you once you grant them access), then hand the numeric Pixel ID to
  the site. Same ownership rule: the pixel + its audiences should live under
  Nico, with the agency granted access — not the other way around.

**Bottom line:** Nico owns both assets under his own accounts; the agency gets
*access*, not ownership. The FB person handles the Meta side; GA4 is a 10-minute
job on Nico's Google account.

---

## Activation steps (when the IDs exist)

1. Vercel → **The Order** project → **Settings → Environment Variables**.
2. Add the variable(s) for **Production** (and Preview if you want test data):
   - `VITE_GA4_MEASUREMENT_ID` = `G-XXXXXXXXXX`
   - `VITE_META_PIXEL_ID` = `1234567890` (numeric)
3. **Redeploy** (env vars only take effect on a fresh build — Vite inlines them
   at build time; a redeploy of the existing commit is enough).
4. Verify — see below.

## Verify it's live

- **GA4:** GA dashboard → **Realtime**. Open the site, you should appear within
  ~30s. Then in **Admin → Events**, mark `form_submitted` as a **key event**
  (that's your conversion). Note: our `session_start` is sent to GA4 as
  `order_session_start` because GA4 reserves the name `session_start`.
- **Meta Pixel:** install the **Meta Pixel Helper** Chrome extension → load the
  site → it should show PageView firing, and a **Lead** event after a form
  submit. Or Events Manager → **Test Events**.

## What maps to what

- `form_submitted` → Meta **standard `Lead`** event (what the ad algorithm
  optimizes toward) **plus** a custom `form_submitted` event. Fires on submit,
  even if the backend post is queued offline, so conversions aren't under-counted.
- Every other funnel event → Meta `trackCustom` + GA4 `event` (for granular
  audiences / funnel analysis).

## Notes

- **No SPA pageview fix needed.** The public funnel is one scrolling page — a
  single `page_view` on load is correct, and mid-funnel progress is captured as
  events (`question_viewed`), which is richer than fake pageviews. Admin and
  presentations routes deliberately don't load analytics at all.
- **Consent:** there's currently no cookie-consent banner (matches the existing
  PostHog posture). If you run EU/UK traffic, add one before scaling ad spend —
  flag this when the time comes.
- **The real priority for ads is the Pixel, not GA4.** GA4 doesn't optimize
  Meta ads; it's a neutral reference the agency reads. Push the FB person to get
  the Pixel (and ideally the Conversions API, server-side) set up first.
