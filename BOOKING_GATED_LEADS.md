# Booking-gated leads — The Order

**Status: superseded.** The application is now a local qualification filter:
it collects no contact details and sends no applicant data to Wayfinder OS.
Declined applicants see the return-later screen; qualified applicants see
Nico's video/Instagram handoff. The calendar is isolated at `/application` and
Nico shares that URL privately after the Instagram conversation.

The material below documents the retired implementation and is retained only
for history.

**Previous status:** built on branch `booking-gated-leads`, reviewed by the OS side,
**merge held**. The trigger to merge is the OS deploy being live on production
with our origins baked into the frame allowlist and the booking page's toggles
verified — steps 1 and 2 of "Before this can go live". The OS work rides
`feature/crm`, so it reaches production with their next `dev → main`
promotion; if this needs to be live sooner, that promotion is the thing to
accelerate, not this branch.

Supersedes the delivery half of `WAYFINDER_WIRING.md`. The payload contract
there (dual-shape answers, phone-as-string, attribution) still stands — what
changed is *when* a lead is created and *who* sends it.

## What changed

Before: the application asked three questions, then name/email/phone, then
posted a lead to Wayfinder from the browser. The booking calendar came after,
as a nicety. Every completed form became a CRM record whether or not anyone
ever booked a call.

Now: **no booking, nothing enters the CRM.**

1. The form asks multiple-choice questions only — no name, email or phone.
   Answers are held in React state and sent nowhere.
2. After the last question the applicant either sees the negation screen (a
   declining answer — unchanged) or the **commitment gate**: the scarcity line,
   the one-shot rule, and the challenge, with a single "Book My Call" button.
   Nothing is collected or sent there — pressing it only reveals the calendar.
3. They type their details into the calendar and book.
4. The calendar posts `wf-booking-confirmed` to our page. That message — and
   only that message — releases the lead.
5. The browser POSTs the held answers + the message's contact fields to
   **our own** `/api/funnel-lead`, which attaches the funnel secret and
   forwards to Wayfinder. The secret never reaches the browser.

Result: one deal per booking, on the booked stage, owned by the booked agent,
titled with the funnel name, enriched with the questionnaire and attribution.

## The flow in code

| Step | Where |
|---|---|
| Choice questions, answers held in state | [ApplicationSection.jsx](src/components/sections/ApplicationSection.jsx) |
| One question, no contact fields, no submit | [QuestionSlide.jsx](src/components/ui/QuestionSlide.jsx) |
| Disqualify gate → negation screen | `finish()` in [ApplicationSection.jsx](src/components/sections/ApplicationSection.jsx) |
| Commitment gate → reveals the calendar | [CommitmentGate.jsx](src/components/ui/CommitmentGate.jsx) |
| Calendar embed + `wf-booking-confirmed` listener | [BookingWidget.jsx](src/components/ui/BookingWidget.jsx) |
| Confirmed state + legal lines | [FinalScreen.jsx](src/components/ui/FinalScreen.jsx) |
| Payload build + billed conversion | `buildPayload()` / `handleBooked()` in [ApplicationSection.jsx](src/components/sections/ApplicationSection.jsx) |
| POST + offline retry queue | [submitLead.js](src/lib/submitLead.js) |
| Server relay holding the secret | [api/funnel-lead.js](api/funnel-lead.js) |

## The postMessage contract

The calendar posts, once, on a successful booking:

```json
{
  "type": "wf-booking-confirmed",
  "slug": "nico-seedsman-the-order",
  "mode": "team",
  "bookingId": "<convex bookings id>",
  "email": "jane@example.com",
  "name": "Jane Doe",
  "phone": "+15551234567",
  "startTime": 1769500800000,
  "timezone": "America/Chicago"
}
```

- `phone` is **absent** when they left it empty — phone is optional platform-wide.
- `startTime` is epoch milliseconds.
- It is **not** re-emitted if the iframe reloads onto its confirmation screen.
  Act on first receipt.

All three checks run before anything is trusted, because this handler releases
a real lead and fires a billed Meta `Lead`:

```js
if (event.origin !== BOOKING_ORIGIN) return              // derived from BOOKING_URL
if (event.source !== frameRef.current.contentWindow) return
if (event.data?.type !== 'wf-booking-confirmed') return
```

## The lead POST

Browser → `POST /api/funnel-lead` (same-origin, no key) →
`POST https://wayfindercollective.io/api/funnel/the-order-funnel/lead` with
`X-API-Key: <webhookSecret>` (and `Authorization: Bearer` with the same value —
the two handler generations disagree; sending both is free).

**Which URL it actually posts to**, in order: `WAYFINDER_LEAD_URL` if set,
else the existing `VITE_WAYFINDER_WEBHOOK_URL` read server-side, else
`WAYFINDER_OS_ORIGIN` + `WAYFINDER_FUNNEL_SLUG`. The middle rung is deliberate:
the OS's app-host route ships with their `feature/crm` promotion, so until that
lands the relay keeps using the Convex endpoint that is already live in
production. Leads therefore keep flowing through the cutover; `bookingId`
enrichment simply starts working once the OS side is deployed.

Note `the-order-funnel` — the slug in the URL — is *not* the same string as
`VITE_FUNNEL_SLUG=the-order`, which is only a payload field.

The relay sanitizes before forwarding: scalars only, strings capped at 800
chars, ≤60 keys, ≤32 KB body, and an `Origin` — if the request carries one —
that must be ours. It requires a valid `email`; `bookingId` is what makes the
OS enrich the booking's existing deal instead of creating a second one, and it
is the permanent idempotency key, so replays are safe.

Its status codes drive the client's queue: `502` (Wayfinder rejected or
unreachable) and `503` (secret not configured) leave the lead queued in
localStorage for [usePendingLeadsSync](src/hooks/usePendingLeadsSync.js) to
retry with backoff; `400` means the payload was malformed. This matters more
than it used to — by the time it runs, a real call is already in the calendar,
so a lost POST costs the questionnaire enrichment on a booking that exists.
`/?admin=pending-leads` still lists and re-fires anything stuck.

## Before this can go live

1. **Set `WAYFINDER_FUNNEL_SECRET`** in Vercel (Production + Preview) to the
   funnel's `webhookSecret` from the OS funnel settings. Not `VITE_`-prefixed —
   anything `VITE_` is baked into the public bundle. Then **delete
   `VITE_WAYFINDER_API_KEY` and `VITE_WAYFINDER_WEBHOOK_URL`**, which are now
   unused and only leak a key. (The relay falls back to reading the old
   `VITE_WAYFINDER_API_KEY` server-side, so it will not break the moment the
   new var is set — but do finish the rename.)
2. **`BOOKING_FRAME_ANCESTORS`** on the OS must include
   `https://theorder.global` and `https://www.theorder.global`. It is a
   build-time var and its value *replaces* the default, so it needs every
   existing origin plus ours. Without it the iframe renders blank — silently,
   because a `frame-ancestors` block still fires the load event.
3. **On the booking page `nico-seedsman-the-order`:** `createCrmDeal` **ON**
   (pages created before that field existed resolve OFF) and
   `hideContactFields` **OFF** — this funnel has no other way to collect
   contact details.
4. **Decide on `requirePhone`.** Phone is optional at booking platform-wide, so
   some deals will arrive without a number. If the power-dialer needs one, that
   is a per-page `requirePhone` follow-up on the OS side.

## After cutover: rotate the funnel secret

**The current secret is burned and must be replaced — this is not optional.**
It shipped as `VITE_WAYFINDER_API_KEY`, which Vite bakes into the public
bundle, so it has been extractable from `theorder.global`'s JavaScript by
anyone since launch. Moving it server-side protects the *next* secret, not
this one.

Once this branch is merged and deployed:

1. Generate a new `webhookSecret` on the funnel in the OS.
2. Update `WAYFINDER_FUNNEL_SECRET` in Vercel (Production + Preview).
3. Redeploy.

The window between (1) and (3) is self-healing: leads posted against the old
secret get a `502` from the relay, stay in the localStorage queue, and land on
the next retry once the new value is live. No lead is lost and, because the OS
deduplicates on `bookingId`, no duplicate is created either.

## Decisions worth knowing

- **SMS consent is sent conservatively.** There is no consent checkbox any
  more — we do not collect the number. `smsConsentMarketing` and the legacy
  `smsConsent` are `false`; only `smsConsentOperational` is true, and only when
  a number came back. Claiming marketing consent we never captured would be a
  TCPA misstatement. If Nico wants marketing SMS from this funnel, the consent
  has to be captured on the booking page and reported by the OS — not asserted
  here.
- **The disclosures moved with the fields.** The SMS line and the Privacy /
  Terms links now render under the calendar, which is where details are
  actually typed. Both are still CMS-editable (Sections → Legal lines).
- **The honeypot is gone** — it lived on the contact step. Do not read that as
  "bots can no longer get in". A bot does not need a *valid* `bookingId`: the
  relay is public, and anything POSTing junk (or nothing) in that field falls
  through to the OS's normal create path and produces a bookingless deal. The
  `Origin` check only constrains browsers; `curl` sets whatever it likes. This
  is still strictly better than before — the old design published the funnel
  secret in the bundle, so bots could post straight to the OS — but it is not
  closed. Closing it means validating that a `bookingId` actually correlates
  with a booking, which only the OS can do: they have offered a per-funnel
  "require booking" toggle as a follow-up. Worth taking; not a blocker.
- **Booking-step drop-off is invisible to the OS** by design. Finishing the
  questions fires `questionnaire_completed` and booking fires `form_submitted`
  (→ Meta `Lead`); the gap between those two counts is the drop-off, and it
  only exists in PostHog/GA4/Meta.
- **The billed conversion moved to the booking.** `form_submitted` fires in
  `handleBooked`, at intent (before the POST, never on POST-success), behind a
  synchronous ref lock, and never on the negation branch. Income and
  main-challenge props are still stripped before the pixel — see `metaSafe()`
  in [analytics.js](src/lib/analytics.js).
- **A booking made via the "open in a new tab" escape hatch cannot post back**,
  so it produces a booking and a deal with no questionnaire enrichment. That
  link has to stay (a CSP block is otherwise invisible), so keep the allowlist
  correct and the fallback stays unused.
- **Leads queued by the pre-cutover build** have no `bookingId`. The relay
  forwards them anyway, as plain leads — they are real applications from
  people who gave their details on-site, and stranding them would be worse
  than a duplicate.

## Test plan

1. Answer through to the calendar → nothing in the CRM yet. Confirm.
2. Book → deal appears on the booked stage, owned by the booked agent, with the
   questionnaire answers **and the right lead score** (check the score, not
   just that the record exists).
3. Book without a phone number → lead still lands, no `[object Object]`, no
   fabricated consent flags.
4. Pick a declining answer → negation screen, no calendar, no CRM record, no
   `Lead` event.
5. Break the secret in Preview → UI still shows the booked confirmation, lead
   sits in `/?admin=pending-leads`, and re-fires cleanly once restored.
6. Land via a UTM link → `utm_*` on the lead and on the deal.
7. Check the built bundle: `grep -c fnl_ dist/assets/*.js` must be 0.
8. After the secret rotation above, re-run test 2 — a booking must still
   produce a deal, proving Vercel picked up the new value.
