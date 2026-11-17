# Deploy — Cloudflare Pages + D1 (free tier)

Cloudflare account: **ravikumar.inbh@gmail.com**. Everything below is free (Pages, Functions, D1).
Only run these steps when you are ready to go live.

## 1. Log in to Cloudflare from this folder
```bash
npx wrangler login
```
A browser window opens; approve access with the ravikumar.inbh@gmail.com account.

## 2. Create the database and load the schema
```bash
npx wrangler d1 create portfolio-admin
```
Copy the printed `database_id` into `wrangler.toml` (replace `local-placeholder`), then:
```bash
npx wrangler d1 migrations apply portfolio-admin --remote
```

## 3. Create the Pages project and set secrets
```bash
npm run build
npx wrangler pages project create rrk-portfolio --production-branch main
node scripts/hash-password.mjs "<choose-a-strong-password>"
```
`hash-password.mjs` prints the password hash. Then set the three secrets (each command asks for the value):
```bash
npx wrangler pages secret put ADMIN_USER --project-name rrk-portfolio
npx wrangler pages secret put ADMIN_PASS_HASH --project-name rrk-portfolio
npx wrangler pages secret put ENC_KEY --project-name rrk-portfolio
```
Values for each secret:
- `ADMIN_USER`: your login name, e.g. `ravi`.
- `ADMIN_PASS_HASH`: the hash printed by `hash-password.mjs`.
- `ENC_KEY`: a random key. Generate one with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  ```
  Keep a copy of it: if `ENC_KEY` changes, the saved AI key must be re-entered.

Do **not** set `AI_MOCK` in production.

## 4. Deploy
```bash
npm run build
npx wrangler pages deploy dist --project-name rrk-portfolio
```
The site will be at `https://rrk-portfolio.pages.dev` and the admin at `https://rrk-portfolio.pages.dev/admin/`.
Add the AI key under Admin → Settings.

(Optional) In the Cloudflare dashboard you can connect the GitHub repo to the Pages project instead, so every `git push` deploys automatically. Use build command `npm run build` and output folder `dist`, then add the same secrets and the D1 binding `DB`.

## 5. GitHub Pages / Vercel
`git push` to `main` updates GitHub Pages and Vercel with the new public site. The admin works only on the Cloudflare URL; on the other hosts it shows "works only on the Cloudflare site".
