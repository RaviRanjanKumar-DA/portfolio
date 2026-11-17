# Portfolio Polish + Job-Hunt Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the public portfolio and add a private Cloudflare-hosted admin (job tracker, apply wizard, history, templates, AI, CV builder, dashboard).

**Architecture:** The static site stays at the repo root (GitHub Pages and Vercel keep working). The `admin/` folder holds a vanilla-JS SPA. `functions/api/*` are Cloudflare Pages Functions backed by D1. Pure logic (fact guard, ATS, template fill, stats, crypto helpers) lives in `admin/lib/*.js` as ES modules, shared by the browser, the Functions and the Node tests.

**Tech Stack:** HTML/CSS/vanilla JS (ES modules), Cloudflare Pages Functions, D1 (SQLite), Web Crypto, Chart.js 4.4.1 (cdnjs), Font Awesome 6.5.1, `node:test`, wrangler (devDependency).

**Spec:** `docs/superpowers/specs/2026-11-17-portfolio-admin-design.md`

## Global Constraints
- ₹0: no paid services, no Naukri/LinkedIn/portal APIs, no server-side email sending.
- Nothing is deployed or pushed without Ravi's explicit go-ahead. Everything is verified locally with `npx wrangler pages dev . --d1 DB=portfolio-admin`.
- All dates are displayed and filtered in IST (`Asia/Kolkata`). They are stored as UTC ISO strings.
- AI keys are never returned to the browser. Only the masked form `…last4`.
- The public site must keep working on GitHub Pages (no build step; `functions/`, `migrations/`, `docs/`, `tests/`, `scripts/` excluded via `_config.yml`).
- Status values (exact): `saved, applied, shortlisted, interview, offer, joined, rejected, withdrawn, no_response`.
- Platforms (exact): `Email, Naukri, LinkedIn, Indeed, Instahyre, Foundit, Company site, Referral, Other`.
- Template kinds (exact): `email, linkedin_note, linkedin_inmail, naukri_message, follow_up, thank_you, cover_letter, other`.
- AI providers: `openai, anthropic, gemini, groq, openrouter`.
- Session cookie `rrk_session`: `HttpOnly; Secure; SameSite=Strict; Path=/`, 7 days. Throttle: 5 failures per IP within 15 minutes leads to a 15-minute lock.
- PBKDF2-SHA256, 100000 iterations, 16-byte salt, hash format `pbkdf2$100000$<saltB64>$<hashB64>`.

## Review Focus
1. Tailored CV contains a number/company/date not in master (e.g. "45%" when master says 40%) → flagged, Save blocked — test in Task 3.
2. JD/notes containing `<script>` or quotes → rendered as text, never HTML — `esc()` test in Task 3, and used by every view.
3. AI provider returns an error / bad key / timeout → a readable message in the UI, no crash, nothing saved — test in Task 5.
4. Changing status twice quickly, or deleting an application → events remain consistent (cascade delete of events) — smoke test in Task 4.
5. Session expired mid-use → API 401 → the SPA redirects to login and keeps the current hash — handled in Task 6 `api.js`, checked in Task 9.

---

### Task 1: Project scaffold, D1 schema, seed

**Files:**
- Create: `package.json`, `wrangler.toml`, `.gitignore` (adds `node_modules`, `.wrangler`, `.dev.vars`), `_config.yml`, `.dev.vars` (local only), `migrations/0001_init.sql`, `migrations/0002_seed.sql`, `scripts/hash-password.mjs`

**Interfaces:**
- Produces: the D1 binding `DB`; env `ADMIN_USER`, `ADMIN_PASS_HASH`, `ENC_KEY` (base64 32 bytes); tables per spec: `applications, events, templates, documents, profile, settings, cv_master, cv_versions, messages, sessions, login_attempts`. `events.application_id` uses `ON DELETE CASCADE`.

- [ ] Step 1: `package.json` scripts: `"dev": "wrangler pages dev . --d1 DB=portfolio-admin --port 8788"`, `"db:local": "wrangler d1 migrations apply portfolio-admin --local"`, `"test": "node --test tests/"`. devDependency wrangler@4.
- [ ] Step 2: Write `0001_init.sql` (all tables, indexes on `applications(status)`, `applications(applied_at)`, `events(application_id, created_at)`).
- [ ] Step 3: Write `0002_seed.sql`:
  - the profile and `cv_master` JSON taken verbatim from the current `index.html` (header, summary, 4 roles with bullets and dates, skills groups, 6 GitHub projects, education);
  - 8 starter templates, one per kind.
- [ ] Step 4: Write `scripts/hash-password.mjs <password>`, which prints the hash in the constraint format.
- [ ] Step 5: Run `npm install && npm run db:local`. Expected: migrations applied, `wrangler d1 execute portfolio-admin --local --command "select count(*) from templates"` → 8.
- [ ] Step 6: Commit.

### Task 2: Public site polish + animated diagrams

**Files:** Modify `index.html`, `style.css`, `script.js`, `README.md`. Create `favicon.svg`, `og-image.png` (generated from the profile + name, 1200×630).

- [ ] Step 1: Fixes:
  - About icon `fa-file-chart-column` → `fa-file-lines`/`fa-table-list`;
  - footer year via `<span id="year">`;
  - Education `id="education"`, location "Muzaffarpur, Bihar", added to nav and footer;
  - `rel="noopener"` on all `target="_blank"` links;
  - favicon, OG/Twitter meta tags, canonical, JSON-LD `Person`;
  - focus-visible styles;
  - `prefers-reduced-motion` disables the canvas, typing and the flows;
  - a small footer link "Admin" → `admin/`.
- [ ] Step 2: New section `#process` "How I turn data into decisions": an inline SVG pipeline (5 nodes) with an animated dash offset and moving dots, started by IntersectionObserver.
- [ ] Step 3: New "Automation in action" diagram in the same section: Lead intake → n8n/Pabbly → CRM → Segmentation → Alerts/MIS, with packets travelling along the paths.
- [ ] Step 4: Skills: proficiency bars animate on reveal. Timeline: a vertical progress line that scales with scroll. Canvas particles are halved below 768px.
- [ ] Step 5: Contact form: after the Web3Forms success, best-effort `fetch('/api/contact')` (errors ignored).
- [ ] Step 6: README rewritten (site + admin + local run + deploy steps).
- [ ] Step 7: Verify in the browser at 375px and desktop: no console errors, all sections reveal, and with reduced motion on there is no animation. Commit.

### Task 3: Shared pure modules (TDD)

**Files:** Create `admin/lib/esc.js`, `admin/lib/template.js`, `admin/lib/factguard.js`, `admin/lib/ats.js`, `admin/lib/stats.js`, `admin/lib/time.js`. Tests in `tests/*.test.mjs`.

**Interfaces (Produces):**
- `esc(s: any) -> string`: escapes the HTML characters `& < > " '`.
- `fillTemplate(body: string, vars: object) -> string`: replaces `{{key}}`; unknown keys are left as `{{key}}`.
- `templateVars(body) -> string[]`.
- `extractFacts(text: string) -> {numbers:string[], years:string[], terms:string[]}`: numbers incl. `%`/`+`/ranges like `20–30%`, 4-digit years, month-year, capitalised multi-word names, and known tool names.
- `factGuard(masterCv: object, tailoredCv: object) -> {ok:boolean, issues:[{path, fact, kind}]}`: each fact in the tailored CV must appear in the master's fact set (case-insensitive, normalised dashes and spaces). Company names, titles and dates must match a master role exactly.
- `cvToText(cv) -> string`.
- `atsCheck(jdText: string, cvText: string) -> {score:number(0–100), found:string[], missing:string[]}`: keyword extraction from the JD (stop-word filtered, known-skills dictionary plus bigrams).
- `computeStats(apps: object[], events: object[], range: {from?:string}) -> {kpis, funnel, weekly, byPlatform, statusMix, responseByPlatform, avgDaysToResponse}`.
- `fmtIST(iso) -> "17 Nov 2026, 07:45 PM"`, `istDate(iso) -> "2026-11-17"`.

- [ ] Step 1: Failing tests:
  - `esc('<script>"x"</script>')` → `&lt;script&gt;&quot;x&quot;&lt;/script&gt;`.
  - `fillTemplate('Hi {{name}} {{x}}', {name:'A'})` → `'Hi A {{x}}'`.
  - `factGuard(master, tailoredWith('45%'))` → `ok:false`, with an issue whose fact is `45%`.
  - `factGuard(master, reordered(master))` → `ok:true`.
  - A tailored CV with company "Google" → issue kind `company`.
  - `atsCheck('Power BI SQL Python Snowflake', cvText)` → `missing` contains `snowflake`, `found` contains `power bi`.
  - `computeStats`: with 4 apps (2 applied, 1 interview, 1 rejected), the response rate is 50% (an app counts as a response if its status went beyond applied).
  - `fmtIST('2026-11-17T14:15:00Z')` → `'17 Nov 2026, 07:45 PM'`.
- [ ] Step 2: `npm test` → FAIL.
- [ ] Step 3: Implement the modules.
- [ ] Step 4: `npm test` → PASS. Commit.

### Task 4: Backend auth + core API

**Files:**
- Create: `functions/_lib/http.js` (`json(data, status=200)`, `err(status, msg)`, `readJson(req)`), `functions/_lib/auth.js`, `functions/_lib/crypto.js`
- Create: `functions/api/_middleware.js`, `functions/api/auth/{login,logout,me,password}.js`, `functions/api/applications/index.js`, `functions/api/applications/[id].js`, `functions/api/applications/[id]/events.js`, `functions/api/templates/index.js`, `functions/api/templates/[id].js`, `functions/api/{profile,settings,stats,backup,contact}.js`, `functions/api/messages/index.js`, `functions/api/messages/[id].js`, `functions/api/cv/master.js`, `functions/api/cv/versions/index.js`, `functions/api/cv/versions/[id].js`
- Test: `scripts/smoke.mjs`

**Interfaces (Produces):**
- `auth.js`: `hashPassword(pw) -> string`, `verifyPassword(pw, stored) -> bool`, `createSession(env) -> token`, `getSession(env, req) -> {user}|null`, `throttle(env, ip) -> {locked:boolean, retryAfter:number}`.
- `crypto.js`: `encrypt(env, plain) -> "ivB64.ctB64"`, `decrypt(env, s) -> string`.
- The middleware allows `/api/auth/login` and `/api/contact` without a session; otherwise a request without a session gets 401 `{error:'unauthorized'}`.
- REST:
  - `GET/POST /api/applications` (query: `status, platform, q, from, to`).
  - `GET/PUT/DELETE /api/applications/:id`. PUT with a changed status inserts a `status_change` event and sets `applied_at` the first time the status becomes `applied`.
  - `GET/POST /api/applications/:id/events` (POST `{type, detail}` for note/email_opened/message_copied/follow_up).
  - `/api/templates[/:id]` CRUD.
  - `GET/PUT /api/profile`, `GET/PUT /api/cv/master`, `/api/cv/versions[/:id]` (POST inserts an event `cv_tailored` when `application_id` is set).
  - `GET /api/stats?range=7|30|90|all` returns `{apps, events}`, aggregated client-side via `computeStats`.
  - `GET /api/backup` returns all tables as JSON; `POST /api/backup` imports, replacing everything inside a transaction batch.
  - `GET/PUT /api/settings` (the key is written encrypted, read masked).
  - `POST /api/contact` (public, length-limited, honeypot `botcheck`), `/api/messages[/:id]`.
- [ ] Step 1: Write `scripts/smoke.mjs` (against `http://localhost:8788`). It covers:
  - login with a wrong password, 6 times → the 6th returns 429;
  - login OK (after clearing `login_attempts` for local) → cookie set;
  - create an application → change its status to `applied`, then `interview` → events list has `created`, 2× `status_change`, `applied_at` set;
  - delete it → events gone;
  - templates CRUD;
  - settings key round-trip returns masked `…abcd`;
  - backup export → import → counts are equal;
  - unauthenticated GET → 401.
- [ ] Step 2: Run against `npm run dev` → FAIL.
- [ ] Step 3: Implement.
- [ ] Step 4: Smoke → all PASS. Commit.

### Task 5: AI proxy

**Files:** Create `functions/_lib/ai.js`, `functions/api/ai/generate.js`, `functions/api/ai/test.js`, `admin/lib/prompts.js`.

**Interfaces (Produces):**
- `callAI(env, {provider, model, key, system, user, json:boolean}) -> {text}`, throwing `AIError(message, status)`.
- Provider endpoints:
  - openai `https://api.openai.com/v1/chat/completions`;
  - anthropic `https://api.anthropic.com/v1/messages` (`anthropic-version: 2023-06-01`);
  - gemini `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`;
  - groq `https://api.groq.com/openai/v1/chat/completions`;
  - openrouter `https://openrouter.ai/api/v1/chat/completions`.
- Timeout: 45 s via AbortController.
- `POST /api/ai/generate {task, input}` reads the provider/key from settings, builds prompts from `prompts.js`, and returns `{text}` or `{error}` with status 400/502.
- Tasks (in `prompts.js`): `extract_job` (returns JSON `{company, role, location, work_mode, salary, skills[], contact_email}`), `match_score`, `cover_letter`, `email_apply` (JSON `{subject, body}`), `linkedin_note` (≤300 chars), `recruiter_message`, `follow_up`, `template_create`, `template_improve` (mode: improve/shorten/formal/friendly), `tailor_cv` (JSON CV in the same schema; system prompt: "use ONLY facts in MASTER_CV; never add numbers, employers, dates, tools, degrees"), `free`.
- A mock provider `mock` is enabled only when env `AI_MOCK=1` (local), returning deterministic outputs.
- [ ] Step 1: Smoke additions:
  - with `AI_MOCK=1`, `generate {task:'email_apply'}` → JSON with subject and body;
  - with no key set (non-mock) → 400 `"Add an AI key in Settings"`;
  - with an invalid provider key (a real call to openai with `sk-bad`) → 502 with the provider message.
- [ ] Step 2: FAIL → implement → PASS. Commit.

### Task 6: Admin shell, login, API client

**Files:** Create `admin/index.html`, `admin/admin.css`, `admin/js/app.js`, `admin/js/api.js`, `admin/js/ui.js`, `admin/js/views/login.js`.

**Interfaces (Produces):**
- `api.get/post/put/del(path, body?) -> Promise<json>`. On a 401 it stores `location.hash` in sessionStorage and routes to `#/login`. When the API is unreachable (GitHub Pages) it shows "Admin works only on the Cloudflare site".
- `ui.toast(msg, type)`, `ui.modal({title, body, actions})`, `ui.copy(text)`, `ui.h(strings...)` (a tagged template that auto-escapes interpolations using `esc`).
- Router: `#/dashboard, #/applications, #/applications/:id, #/apply, #/templates, #/cv, #/studio, #/inbox, #/profile, #/settings`. Each view module exports `render(el, params)`.
- Layout: sidebar (collapsible on mobile), topbar with logout, the same dark brand palette as the public site, plus a light-mode toggle.
- [ ] Step 1: Implement. In the browser: login with a wrong password → error toast; with the correct one → the dashboard route; refresh keeps the session; logout → login.
- [ ] Step 2: Commit.

### Task 7: Applications, detail/history, apply wizard, dashboard

**Files:** Create `admin/js/views/{dashboard,applications,detail,apply}.js`.

- [ ] Step 1: Dashboard:
  - KPI tiles;
  - Chart.js charts: funnel (horizontal bar), weekly line for 12 weeks, platform bar + response by platform, status donut;
  - follow-ups due and overdue;
  - an activity feed (fmtIST);
  - a range filter (7/30/90/all);
  - empty state with a CTA.
- [ ] Step 2: Applications:
  - a table/Kanban toggle; the Kanban uses native drag and drop, and a drop issues a PUT status;
  - filters;
  - CSV export (client-side, IST dates).
- [ ] Step 3: Detail:
  - an editable form;
  - a status stepper;
  - the timeline with an icon per event type;
  - add a note;
  - saved AI documents;
  - CV versions linked to it;
  - delete with confirm.
- [ ] Step 4: Apply wizard:
  1. URL + JD → "Extract with AI" (or fill manually).
  2. Match score + ATS keywords (`atsCheck` against `cvToText(master)`).
  3. Channel tab:
     - **Email:** subject/body (AI or template), a CV version link picker. "Open in Gmail" opens `https://mail.google.com/mail/?view=cm&fs=1&to=&su=&body=`, with a `mailto:` button too. Opening logs `email_opened` and asks "Mark as applied?".
     - **Portal:** cover letter / recruiter message / LinkedIn note (char counter 300), Copy (logs `message_copied`), Open job link, Mark as applied.
  4. Follow-up date (+7 days by default). Save creates the application, its events and its documents.
- [ ] Step 5: Verify in the browser with the AI mock: run the full wizard → the application appears on the dashboard and its history shows each step. Commit.

### Task 8: Templates, CV builder, AI Studio, Inbox, Profile, Settings

**Files:** Create `admin/js/views/{templates,cv,studio,inbox,profile,settings}.js`, `admin/cv-print.css`.

- [ ] Step 1: Templates:
  - list by kind, an editor with a variables panel, a live preview with sample vars, copy;
  - AI buttons: create from description, improve, shorten, formal, friendly.
- [ ] Step 2: CV builder:
  - a master CV structured editor (add/remove/reorder roles and bullets);
  - "Tailor for job" (pick an application or paste a JD) → AI `tailor_cv` → `factGuard` → a side-by-side diff (removed/added words) with red flags. Save is disabled while issues exist, unless each flagged item is removed or explicitly "accepted as true" (an accept adds the fact to master only after confirmation);
  - ATS score;
  - templates `classic` / `modern` rendered into an A4 print view → `window.print()`;
  - a versions list.
- [ ] Step 3: AI Studio: presets + free prompt, output with Copy / Save as template.
- [ ] Step 4: Inbox (mark read, reply via Gmail compose), Profile form.
- [ ] Step 5: Settings:
  - provider/model/key with a Test button (`/api/ai/test`);
  - change password (current + new ×2, min 10 characters);
  - backup download/import (with confirm);
  - a "last backup" reminder.
- [ ] Step 6: Verify each screen in the browser (AI mock), including CV print preview and a factGuard block scenario. Commit.

### Task 9: End-to-end verification + docs

- [ ] Step 1: `npm test` PASS, `node scripts/smoke.mjs` PASS.
- [ ] Step 2: Browser pass:
  - public site at desktop and 375px;
  - admin at desktop and 375px;
  - session expiry (delete the cookie → next action redirects to login and returns to the same hash);
  - XSS check (JD with `<img onerror>` shows as text).
- [ ] Step 3: Write `docs/DEPLOY.md` (wrangler login, `d1 create`, migrations `--remote`, Pages project + secrets, git push).
- [ ] Step 4: Commit locally. Do NOT push or deploy. Show Ravi screenshots and ask.
