# Portfolio polish + Job-Hunt Admin — Design

Date: 2026-11-17 · Owner: Ravi Ranjan Kumar

## Intent
1. Make the public portfolio more organised, more professional and more animated, and fix what is wrong or missing.
2. Add a private admin panel (with login) for running the job hunt from one place: prepare applications with AI, apply by email/Naukri/LinkedIn/other portals, and keep a full history of where and when he applied and how each one moved.
3. Zero cost. No paid services, and no Naukri/LinkedIn/portal APIs.

## Goals
- Public site: fix bugs, add animated diagrams (data pipeline, automation flow, career timeline, skills), favicon + social preview, accessibility (reduced motion, alt text), responsive polish.
- Admin: login, application tracker with status history, AI-generated cover letters/messages/templates, a one-click apply flow, a template library, a dashboard, backup/export.
- Bring-your-own AI key: OpenAI, Anthropic (Claude), Google Gemini, Groq, OpenRouter.

## Non-goals
- No automatic form submission or scraping on Naukri/LinkedIn (no API, and bots risk an account ban).
- No sending email through a server. Email goes out from his own Gmail.
- No multi-user support. One admin only.

## Anti-goals
- Any recurring cost.
- The AI key or application data ever being visible to visitors.
- Breaking the public site that is live today on GitHub Pages.

## Constraints
- Repo: `RaviRanjanKumar-DA/portfolio`, plain HTML/CSS/JS, served by GitHub Pages and Vercel.
- Admin hosting: **Cloudflare Pages + Pages Functions + D1** on the Cloudflare account `ravikumar.inbh@gmail.com`, free tier.
- GitHub Pages cannot run a backend, so the admin works only on the Cloudflare URL. The public site keeps working on all three hosts.
- Nothing goes live without his explicit go-ahead. Build and preview locally first (`wrangler pages dev` with a local D1).
- All dates are shown in IST.

## Approaches considered
| Option | Trade-off | Decision |
|---|---|---|
| A. Browser-only storage (IndexedDB, encrypted) | ₹0, no account, but tied to one device and lost if the browser is cleared | Rejected: no sync |
| B. Supabase free | Syncs everywhere, but needs a new account and pauses after 7 days idle | Rejected |
| C1. Vercel + Neon Postgres | Same Vercel URL, but the DB sleeps (~1 s wake-up) and only 0.5 GB | Considered |
| **C2. Cloudflare Pages + D1** | Never sleeps, 5 GB, 100k requests/day, account already exists | **Chosen by Ravi** |

## Architecture
```
repo root (static, served everywhere)
├─ index.html / style.css / script.js / thanks.html / icons/   ← public site
├─ admin/            index.html, admin.css, admin.js (SPA, hash routes)
├─ functions/api/    Cloudflare Pages Functions (only run on Cloudflare)
│   ├─ _middleware.js   auth guard + JSON errors
│   ├─ auth/*.js        login, logout, me, change-password
│   ├─ applications/*   CRUD + events
│   ├─ templates/*      CRUD
│   ├─ ai/generate.js   server-side proxy to the AI provider
│   ├─ settings.js, profile.js, stats.js, backup.js
│   └─ contact.js       public: stores contact-form messages (inbox)
├─ migrations/0001_init.sql
├─ wrangler.toml
└─ _config.yml        excludes functions/migrations/docs from GitHub Pages (Jekyll)
```

### Security
- One admin. Username and a PBKDF2-SHA256 password hash (100k iterations, salt) live in Cloudflare secrets `ADMIN_USER` and `ADMIN_PASS_HASH`, generated locally by `scripts/hash-password.mjs`. A password changed from the admin panel is stored in D1 and overrides the secret.
- Sessions: random 32-byte token, stored hashed in D1, sent as an `HttpOnly; Secure; SameSite=Strict` cookie, valid for 7 days.
- Login throttling: 5 failed attempts per IP within 15 minutes locks that IP for 15 minutes (tracked in D1).
- AI keys are encrypted with AES-GCM using the `ENC_KEY` secret before being stored in D1. They are never returned to the browser (it only sees `sk-…last4`). AI calls run server-side.
- `admin/` gets `noindex` and is not linked from the public nav (a discreet link sits in the footer).

### Data model (D1 / SQLite)
- `applications`: id, company, role, platform (Email, Naukri, LinkedIn, Indeed, Instahyre, Foundit, Company site, Referral, Other), job_url, jd_text, location, work_mode, salary, contact_name, contact_email, status, applied_at, follow_up_at, match_score, notes, tags, created_at, updated_at.
- `events` (the history): id, application_id, type (created / status_change / applied / note / email_opened / message_copied / ai_generated / follow_up), from_status, to_status, detail, created_at. Written automatically on every change.
- `templates`: id, name, kind (email, linkedin_note, linkedin_inmail, naukri_message, follow_up, thank_you, cover_letter, other), subject, body with `{{variables}}`, updated_at.
- `documents`: AI outputs saved against an application (kind, content, created_at).
- `profile`: one row with name, headline, resume text, skills, resume link, signature, phone, email, LinkedIn.
- `settings`: key/value (ai_provider, ai_model, ai_key_enc, password override).
- `cv_master`: one row, JSON of the structured CV.
- `cv_versions`: id, application_id (nullable), label, template, json, created_at.
- `messages`: contact-form inbox (name, email, phone, org, message, read, created_at).
- `sessions`, `login_attempts`.

Status pipeline: Saved → Applied → Shortlisted → Interview → Offer → Joined, with exits Rejected / Withdrawn / No response.

## Admin screens
1. **Login.**
2. **Dashboard (expanded on approval):**
   - KPI tiles: total applied, this week, response rate, interview rate, offers, average days to first response.
   - Charts:
     - an animated status funnel;
     - applications per week (last 12 weeks);
     - a platform split, plus response rate by platform (which channel works);
     - a status mix donut;
     - a top-roles/companies table.
   - Follow-ups due today/overdue, a recent-activity feed, and a date-range filter (7/30/90 days/all).
3. **Applications:** a table and a Kanban board (drag to change status), search and filters (status, platform, date), CSV export.
4. **Application detail:** fields, the full timeline (history), saved AI documents, quick actions.
5. **New application / Apply wizard:**
   1. Paste the job URL and description.
   2. AI extracts company, role, location and skills, and gives a match score against his profile.
   3. Choose the channel:
      - **Email:** AI writes the subject and body. Open Gmail compose pre-filled (`https://mail.google.com/mail/?view=cm&to=&su=&body=`, plus a `mailto:` fallback) with the resume link in the body, then log it as "Applied via Email".
      - **Naukri / LinkedIn / other:** AI writes the recruiter message, connection note (≤300 characters) and cover letter. One click copies the text, another opens the job URL, then "Mark as applied".
   4. Set a follow-up reminder (default +7 days).
6. **Templates:** a library with variables, an "AI: create / improve / shorten / make formal" action, preview with live variable fill, copy.
7. **AI Studio:** free-form generation with presets (screening answers, resume bullet rewrite, LinkedIn headline/About, cold email).
8. **CV Builder (added on approval):**
   - **Master CV:** a structured editor (header, summary, experience with bullets, skills, projects, education, certifications), seeded from the current portfolio/CV content.
   - **Tailor for a job:** the AI reorders and rephrases bullets and the summary, and picks the skills that fit the job description, **using only facts from the master CV**.
   - **Accuracy guard:** a deterministic check (not AI) compares every number, %, date, company, title, tool and degree in the tailored CV against the master. Anything not found in the master is flagged red and blocks "Save" until it is accepted or removed. There is also a side-by-side diff against the master.
   - **ATS check:** keyword coverage (JD keywords found vs missing), a section/length lint.
   - **Output:** an ATS-friendly A4 print layout (2 templates: Classic and Modern) → browser "Save as PDF" (free). DOCX is not supported.
   - **Versions:** every tailored CV is saved with a version number, linked to its application, and recorded in the history. A CV version can be attached (as a link) in the email apply flow.
9. **Inbox:** contact-form messages.
9. **Profile:** the master data the AI uses as context.
10. **Settings:** AI provider/model/key with a test button, change password, JSON backup export/import.

Works without an AI key too: templates with variable fill keep working, and the AI buttons explain how to add a key.

## Public site changes
- Fixes: the blank icon (`fa-file-chart-column` does not exist in FA Free), the footer year (made dynamic), the Education location (B.R.A. Bihar University is in Muzaffarpur, Bihar), Education added to the nav (`#education`), outdated README, missing favicon / Open Graph / Twitter card / canonical / JSON-LD Person schema, `rel="noopener"` on external links, keyboard focus styles, `prefers-reduced-motion`.
- New animated sections:
  - **"How I turn data into decisions":** an SVG pipeline (Sources → ETL/SQL → Model → Dashboards → Decisions) with flowing dots.
  - **"Automation in action":** a lead-flow diagram (Lead intake → n8n/Pabbly → CRM → Segmentation → Alerts/MIS) with animated packets.
  - **Skills:** proficiency bars/rings that animate on scroll.
  - **Timeline:** a progress line that draws on scroll.
- Organisation: a consistent section order (Hero → Stats → About → Experience → Skills → How I work → Projects → Achievements → Education → Contact), tighter copy, lighter canvas on mobile.
- The contact form keeps Web3Forms (email delivery) and also posts to `/api/contact` when running on Cloudflare (best effort), so messages show up in the admin Inbox.

## Calls made by the builder (Claude), open to correction
- Pages Functions instead of a separate Worker, which keeps one project and one URL.
- Vanilla JS for the admin (no build step, matching the existing repo). Chart.js from cdnjs for dashboard charts.
- Kanban drag and drop uses the native HTML5 API.
- The Education location is changed to "Muzaffarpur, Bihar".

## Deployment (only after his go-ahead)
1. He logs in: `npx wrangler login` (Cloudflare account ravikumar.inbh@gmail.com).
2. `wrangler d1 create portfolio-admin`, then apply the migration.
3. Create the Pages project (connected to the GitHub repo, or a direct upload) and set the secrets `ADMIN_USER`, `ADMIN_PASS_HASH`, `ENC_KEY`.
4. `git push` to GitHub, which updates GitHub Pages and Vercel too.

## Testing
- Local `wrangler pages dev` with a local D1. Every API endpoint is exercised through the admin UI in the browser, plus a smoke script covering auth, CRUD, events and throttling.
- AI tested against a mock provider locally, and with a real key if he provides one.
- Public site checked at mobile and desktop widths, with no console errors.
