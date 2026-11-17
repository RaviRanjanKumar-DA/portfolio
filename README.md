# Ravi Ranjan Kumar — Portfolio + Job Desk

**Live portfolio:** https://raviranjankumar-da.github.io/portfolio/

Two parts in one repo:

| Part | What | Where it runs |
|---|---|---|
| Public portfolio | `index.html`, `style.css`, `script.js`, `hero3d.js` (Three.js 3D scene), `icons/` | GitHub Pages, Vercel, Cloudflare Pages |
| **Job Desk** admin | `admin/` (vanilla-JS app) + `functions/api/*` (Cloudflare Pages Functions) + D1 database | Cloudflare Pages only (needs the backend) |

## Job Desk features
- **Login:** one admin, PBKDF2 password hash, 7-day HttpOnly session, lock after 5 wrong tries for 15 minutes.
- **Dashboard:** KPIs, funnel, weekly trend, platform split, response rate by platform, follow-ups due.
- **Applications:** table and Kanban board (drag to change status), filters, CSV export, full history (IST timestamps).
- **Apply wizard:** paste a job description → AI fills company/role/recruiter → email via Gmail compose, or a portal message (Naukri/LinkedIn) copied for you → mark as applied, with a follow-up reminder. No Naukri/LinkedIn APIs.
- **CV Builder:** master CV, AI tailoring per job, and an **accuracy guard** that blocks any number, date, employer, title, skill or degree not in the master CV. Also ATS keyword score, diff vs master, Classic/Modern A4 layouts, Save as PDF, and versions.
- **Templates:** email, LinkedIn, Naukri, follow-up, thank-you and cover-letter templates, with `{{variables}}` and AI improve/shorten.
- **AI Studio:** free-form AI help with presets.
- **Inbox:** contact-form messages from the portfolio.
- **Settings:** bring-your-own AI key (OpenAI, Claude, Gemini, Groq, OpenRouter), stored encrypted server-side; change password; JSON backup/restore.

## Run locally
```bash
npm install
npm run db:local        # create the local D1 database (first time)
npm run dev             # http://localhost:8790  (admin at /admin/)
npm test                # unit tests
npm run smoke           # API end-to-end test (with dev server running)
```
`.dev.vars` (git-ignored) holds the local admin user, password hash, encryption key and `AI_MOCK=1`. Its first line is a comment with the local password.

Deploying: see [docs/DEPLOY.md](docs/DEPLOY.md).
