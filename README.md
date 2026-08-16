# LegalOS Nigeria

The operating system for Nigerian law firms — clients, cases, court dates,
documents, evidence, billing, and AI legal assistance in one platform.

## Status

This repo is being built in phases. Current state:

- ✅ Database — complete multi-tenant PostgreSQL schema with Row Level
  Security (`supabase/migrations/complete_database.sql` +
  `002_dashboard_views.sql`)
- ✅ Design system — "Chambers" visual identity (Tailwind tokens, type
  system, `app/globals.css`)
- ✅ Auth — email/password signup (firm bootstrap) + login, session
  middleware, role-aware profile bootstrap
- ✅ Dashboard shell — sidebar, topbar, overview page (active/closed cases,
  upcoming hearings, pending tasks, billing summary)
- ✅ Client management — list with search, new-client form, client detail
  page (contact info, case history, payment history, documents, notes)
- ✅ Case workspace — case list with status filter, new-case form, and a
  tabbed per-case workspace (Overview, Timeline, Tasks, Documents, Evidence,
  Billing) with working add-timeline-note and add/complete-task actions
- ✅ Document + evidence upload — files go straight to Supabase Storage from
  the browser under RLS; server actions only write the metadata row
  (`lib/actions/documents.ts`).
- ✅ OCR text extraction — image documents (vision-model transcription) and
  PDFs, including scanned PDFs with no text layer (the model's native PDF
  file input handles both — `extractDocumentText` in
  `lib/actions/documents.ts`, `AiProvider.extractTextFromImage` /
  `extractTextFromPdf` in `lib/ai/provider.ts`). 15 MB file size cap.
- ✅ Billing — invoice creation with line items, a downloadable branded PDF
  per invoice (`/api/invoices/[id]/pdf`, `@react-pdf/renderer`), an
  "email to client" action that opens the lawyer's own mail client
  pre-filled with a portal link and marks the invoice sent server-side, and
  manual payment recording. Time entries log against a case and roll into
  invoices. **No live Paystack/Flutterwave checkout** — payment method is
  recorded on a manually-entered payment, not a hosted checkout + webhook
  flow, by design for now.
- ✅ Task board — firm-wide Kanban-style view (`/dashboard/tasks`) alongside
  the per-case tasks tab; create, assign, and advance status.
- ✅ Court calendar — `/dashboard/calendar` has four views: List, Day, Week,
  and a full Month grid, each with its own prev/next navigation (date-math
  helpers in `lib/calendar.ts`, unit tested). An add-hearing form updates
  the case's `next_hearing_date`.
- ✅ AI module — case summaries (from timeline + shared notes), legal
  research Q&A, and contract review (runs against a document's OCR'd text)
  are all built on one abstracted provider layer (`lib/ai/provider.ts`,
  OpenAI implementation) — swapping providers means implementing one
  interface, not touching call sites. Every request logs to `ai_requests`
  with status/token usage. **Not built:** transcription, and search stays
  keyword (ILIKE), not semantic.
- ✅ Global search — client-side search across clients/cases/documents from
  the topbar, debounced, RLS-scoped. Keyword matching, not semantic.
- ✅ Notifications — in-app bell with Supabase Realtime live updates (no
  polling). No email delivery yet.
- ✅ Internal messaging — `/dashboard/messages`, conversation threads backed
  by `conversations`/`messages` with RLS.
- ✅ Reports — revenue trend (6-month), case status breakdown, lawyer
  productivity, client acquisition, all computed from real data with no
  hardcoded figures.
- ✅ Client portal — separate `/portal` experience for `client`-role users:
  their own cases, invoice balances (with PDF download), and documents
  marked client-visible. Gated by role in middleware (checked from auth
  metadata, no extra DB round trip) and enforced independently by RLS
  regardless of what the middleware does.
- ✅ Tests — Vitest, 49 tests across billing math (kobo rounding, NaN/
  Infinity guards), time-entry calculations, calendar date-math (month/week/
  day navigation, grid building), and general utils. Run with `npm test`.
  No component or e2e tests yet (no Playwright/Testing Library suite is
  wired up — those packages aren't in the repo, add them if you start
  writing that layer).
- ⬜ Live payment checkout — Paystack/Flutterwave integration, deliberately
  out of scope for now.
- ⬜ AI transcription, semantic/vector search
- ⬜ Email delivery (notifications and invoices both rely on the person's
  own mail client / manual action, not a transactional email provider)
- ⬜ Component and end-to-end tests (unit tests only so far)

## Tech stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS ·
TanStack Query · React Hook Form + Zod · Supabase (Postgres, Auth, Storage,
Realtime) · OpenAI (case summaries, legal research, contract review, OCR —
all behind one abstracted provider layer) · @react-pdf/renderer (invoice
PDFs) · Vitest (unit tests) · Vercel

> **Don't `npm update` the Supabase packages without checking first.**
> `@supabase/supabase-js` and `@supabase/ssr` are pinned to exact versions
> (`2.45.4` / `0.5.1`, no `^`) on purpose. Newer `postgrest-js` releases
> changed their internal type-inference machinery in a way that silently
> collapses every query result to `never` unless the hand-written
> `types/database.ts` carries extra internal marker fields those versions
> expect. If you do want to move to a newer version, run
> `npx tsc --noEmit` straight after and confirm it's still clean before
> committing.

> **`next` is also pinned exactly, and `package-lock.json` is committed —
> both on purpose, learned the hard way.** A caret range on `next` once let
> a fresh `npm install` on Vercel silently jump from 15.1.0 to 16.3.1 — a
> major version this app was never built against, which broke middleware
> (Next 16 deprecates the `middleware.ts` convention in favor of
> `proxy.ts`) and took the entire site down with an opaque
> `MIDDLEWARE_INVOCATION_FAILED`. Separately, `next@15.1.0` itself turned
> out to have a disclosed critical RCE (CVE-2025-66478, CVSS 10.0) that
> Vercel's deploy-time scanner refuses to ship. The Dec 2025 patch for the
> 15.1.x line was `15.1.11`, but by the time this was fixed (Aug 2026)
> Next.js had moved to a monthly security-release cadence and 15.1.x was
> itself behind — so this is pinned to `15.5.23`, the current Maintenance
> LTS patch in the 15.x line as of that date, not just "the first version
> that unblocks the CVE scanner." `eslint-config-next` is pinned to match
> (`15.5.23`) for the same reason — a mismatched lint config against the
> actual Next.js version produces confusing false positives/negatives.
> Bumping to a newer *minor* within 15.x for a security patch is fine and
> expected; jumping the *major* version is not something `npm install`
> should ever decide on its own. If a future Next.js CVE requires another
> bump: check [nextjs.org/blog](https://nextjs.org/blog) for the current
> patched version in the 15.x line specifically (not "latest," which may
> mean 16.x or later by then), update both pins together, run the full
> verification pass below, and commit the regenerated `package-lock.json`
> alongside it.

## Verified

- `npx tsc --noEmit` — passes with zero errors
- `npm run build` — compiles and statically generates all 20 routes
  (verified with the Google Fonts import temporarily swapped for system
  fonts, since the fonts.googleapis.com fetch isn't reachable from every
  sandboxed environment — your own machine or Vercel will fetch them
  directly, no changes needed there)
- `npm test` — 27 tests pass across billing math, time-entry calculations,
  and general utils

## Local setup

1. **Install Node.js 20+.**
2. **Clone and install:**
   ```bash
   git clone <your-repo-url> legalos-nigeria
   cd legalos-nigeria
   npm install
   ```
3. **Create a Supabase project** at [supabase.com](https://supabase.com) →
   New Project.
4. **Run the database migrations.** In the Supabase dashboard SQL editor,
   run every file in `supabase/migrations/` **in this exact order**:
   1. `complete_database.sql`
   2. `002_dashboard_views.sql`
   3. `003_case_timeline.sql`
   4. `004_invoice_items_recalc.sql`
   5. `005_messaging_rls_fix.sql`
   6. `006_enable_realtime.sql`

   Numeric prefix = run order — if you add your own migrations later, keep
   numbering them upward rather than reusing a number.
5. **Configure environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   from Project Settings → API. See comments in `.env.example` for where
   every other value comes from.
6. **Enable email/password auth**: Supabase dashboard → Authentication →
   Providers → Email (on by default, just confirm it's enabled).
7. **Start the dev server:**
   ```bash
   npm run dev
   ```
8. Open `http://localhost:3000`, click **Set up your firm**, and create the
   first account — it becomes `managing_partner` for a new firm workspace.

## Folder structure

```
app/                     Next.js App Router routes
  login/, signup/         Auth pages
  dashboard/               Overview, clients/, cases/, tasks/, calendar/,
                            billing/, ai/, messages/, reports/
  portal/                  Client-facing portal (separate layout, own auth
                            gate via requireClientPortalUser())
components/
  ui/                      Design-system primitives (button, input, badge, ...)
  layout/                  Sidebar, topbar, global search, notification bell
  cases/                   New-case form, case workspace tabs
  documents/, evidence/    Storage upload forms
  billing/, calendar/,     Feature-specific forms (invoice, hearing, task,
  tasks/, ai/, messages/   AI summary request, new conversation)
lib/
  supabase/                Browser + server clients, requireProfile(),
                            requireClientPortalUser()
  actions/                 Server Actions — one file per feature area
  ai/provider.ts            Abstracted AI provider interface + OpenAI impl
  calendar.ts               Pure date-math for list/day/week/month views
  billing.ts, time.ts       Pure calculation helpers (both unit tested)
  utils.ts                 cn(), currency + date formatting
types/database.ts          Hand-typed schema, mirrors the SQL migrations
supabase/migrations/       SQL migrations, run in numeric order (see setup)
tests/                      Vitest unit tests, mirrors lib/ one-to-one
middleware.ts              Session refresh + route protection
```

## Deployment

Import the repo into Vercel, add the environment variables from
`.env.example`, and deploy — `vercel.json` is already configured for the
Next.js framework preset. Point `NEXT_PUBLIC_APP_URL` at your production
domain once one is attached.

## Troubleshooting

- **No way to invite a client to the portal yet** — `clients.portal_user_id`
  links a client record to a login, but the invite flow (create the
  `auth.users` row with `role: "client"` in metadata, then set
  `portal_user_id`) isn't built. Until then, wire it up manually via the
  Supabase dashboard for testing: create the user under Authentication,
  then `update clients set portal_user_id = '<the new user id>' where id =
  '<client id>'`.
- **"That email and password don't match a LegalOS account"** on a fresh
  signup: confirm email/password auth is enabled in Supabase and that you
  ran all six migration files, in order.
- **Dashboard redirects back to `/login`**: the `profiles` row wasn't
  created — check that the `on_auth_user_created` trigger exists (it's
  created at the end of `complete_database.sql`).
- **Notification bell never updates without a manual refresh**: the
  `006_enable_realtime.sql` migration wasn't run — it adds `notifications`
  to Supabase's realtime publication, which isn't on by default. The bell
  degrades silently to "load once" without it, no error thrown.
- **RLS "permission denied" errors**: you're almost always missing a
  `firm_id` on the row you're inserting, or querying as a role the policy
  doesn't grant — see the policy block in `complete_database.sql` for the
  exact rule per table.
