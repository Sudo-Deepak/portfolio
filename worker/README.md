# Portfolio backend (Cloudflare Worker)

A small, free backend that sits alongside the static GitHub Pages portfolio and provides:

- **Analytics collection** — page views, unique visitors, resume downloads, referrers, country, device/browser, and section engagement. Stored in **D1** (persistent).
- **Secure admin dashboard** at `/admin` — single username/password login (session cookie), detailed analytics, **resume re-upload**, and a **reset** button.
- **Resume hosting** at `/resume` — always serves the latest uploaded PDF, stored as a BLOB in **D1** (no R2 bucket needed), with a configurable download filename. The public site links here, so the resume can be replaced with no redeploy.

The admin UI is served by the Worker itself, so login/session cookies are same-origin (`SameSite=Strict`) and secure.

## Routes

| Route | Auth | Purpose |
|---|---|---|
| `POST /collect` | public | Analytics beacon ingest (CORS limited to the site). |
| `GET /resume` | public | Serve latest resume PDF; logs a download. |
| `GET /admin` | session | Login page or dashboard. |
| `POST /admin/login` / `POST /admin/logout` | — / session | Auth. |
| `GET /admin/api/stats` | session | Aggregated analytics JSON. |
| `POST /admin/api/resume` | session | Upload a new PDF. |
| `POST /admin/api/reset` | session | Clear all analytics. |

## One-time setup

> Requires a free [Cloudflare account](https://dash.cloudflare.com/sign-up) and `npx wrangler login`.

```bash
cd worker
npm install
npx wrangler login

# 1. Create resources (D1 + KV; the resume lives in D1, so no R2 needed)
npx wrangler d1 create portfolio_analytics      # -> copy database_id into wrangler.toml
npx wrangler kv namespace create SESSIONS        # -> copy id into wrangler.toml

# 2. Create the tables (events + assets) on the remote D1
npm run db:init:remote

# 3. Set secrets (never commit these)
npm run hash                                      # prints a PBKDF2 hash for your password
npx wrangler secret put ADMIN_USERNAME
npx wrangler secret put ADMIN_PASSWORD_HASH       # paste the hash from `npm run hash`
npx wrangler secret put SESSION_SECRET            # any long random string

# 4. Deploy
npm run deploy
```

After deploy, wrangler prints the Worker URL (e.g. `https://portfolio-backend.<your-subdomain>.workers.dev`).

1. Put that URL into **`src/data/site.ts` → `workerUrl`** (no trailing slash) and push the site.
2. Open **`<workerUrl>/admin`**, log in, and upload your resume (`public/resume.pdf`) once to seed it.
   (Until you do, `/resume` returns 404 and the public site falls back to the copy in `/public`.)

Edit the download filename anytime via `RESUME_FILENAME` in `wrangler.toml`, then `npm run deploy`.

## Local development

```bash
cd worker
cp .dev.vars.example .dev.vars    # fill ADMIN_USERNAME / ADMIN_PASSWORD_HASH / SESSION_SECRET
npm run db:init:local             # create tables in the local D1
npm run dev                       # Worker on http://localhost:8787
```

Run the site with `npm run dev` from the repo root (port 4321). In dev the resume link and
analytics fall back gracefully until `workerUrl` is configured, so the Worker isn't required to view the site.

> Note: `request.cf.country` is usually `undefined` under local Miniflare, so country shows as `XX` locally.

## Secrets — never commit

`ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET` live only in Cloudflare (via `wrangler secret put`) and in your local `.dev.vars` (gitignored). Only a PBKDF2 **hash** of the password is ever stored.
