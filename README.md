# Alireza Kiaee — Portfolio & CMS

A portfolio site with a full WordPress-style CMS, built on Next.js (App Router) + Prisma + Neon Postgres. The previous static site is preserved under `_legacy_static_site/`.

## Stack

- **Next.js 15** (App Router, Server Components, Server Actions)
- **TypeScript**, Tailwind CSS
- **Prisma** + `@neondatabase/serverless` on Neon Postgres
- **Auth**: bcrypt passwords + mandatory TOTP (RFC 6238) + signed session cookie
- **Media**: Vercel Blob in production, local `public/uploads` fallback in dev
- **Tests**: vitest (`npm test`)

## Local development

```bash
npm install
cp .env.example .env.local   # fill in the values (see below)
npm run dev                  # http://localhost:3000 (or -p 3010)
```

### Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon pooled connection string |
| `DIRECT_URL` | Neon direct (non-pooled) string, used by Prisma Migrate |
| `AUTH_SECRET` | 64+ char random hex signing the session JWT |
| `ADMIN_SETUP_KEY` | One-time key required to create the first admin at `/vorudealireza/setup` |
| `APP_URL` | Public base URL (sitemap, canonical URLs) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token (optional; local dev falls back to `public/uploads`) |
| `AI_PROVIDER` | `openai` (any OpenAI-compatible API) or `gemini` (native Google API) |
| `AI_API_KEY` | API key for scheduled post generation (optional; can be set in admin Settings) |
| `AI_BASE_URL` | Endpoint override; defaults per provider (`api.openai.com/v1` or `generativelanguage.googleapis.com/v1beta`) |
| `AI_MODEL` | Default model, e.g. `gpt-4o-mini` or `gemini-2.0-flash` |
| `CRON_SECRET` | Bearer secret protecting `/api/cron/ai-generate`; Vercel Cron sends it automatically |

Generate secrets: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

## Admin

Admin lives at **`/vorudealireza`**.

1. Visit `/vorudealireza/setup` once with `ADMIN_SETUP_KEY` to create the first admin and enroll an Authenticator app (TOTP).
2. Log in at `/vorudealireza/login` — password first, then the 6-digit Authenticator code.
3. Modules: Pages (block editor), Blog Posts (categories/tags, sanitized HTML), Projects (case studies), Services, Testimonials, Technologies, Media Library, Navigation (header/footer menus), Settings, Redirects, Users, Audit Log, AI Content.

### AI Content (scheduled post generation)

The **AI Content** module runs recurring schedules that generate blog posts with an AI
model. Two provider modes: **Google Gemini** (native `generateContent` API) and
**OpenAI-compatible** (OpenAI, OpenRouter, Groq, Azure OpenAI, local servers — anything
exposing `/chat/completions`).

- **Schedules** define a generation brief, an optional rotating topic list, frequency
  (daily / weekly on a weekday / monthly on a day), target status (draft for review or
  auto-publish), category, and tags. Each schedule can override the global model.
- **Configuration** lives in Settings → AI content generation (API key, base URL, default
  model, system prompt) with env-var fallbacks. The key field is write-only.
- **Execution**: `vercel.json` registers a daily cron (06:00 UTC) hitting
  `/api/cron/ai-generate`, which runs every due schedule — Hobby plan only allows
  daily crons, and that's enough for daily/weekly/monthly schedules. For more frequent
  runs on Hobby, point a free external scheduler (e.g. cron-job.org) at the endpoint with
  `Authorization: Bearer <CRON_SECRET>`. A **Run now** button on each schedule
  generates immediately (useful for testing).
- **Every run** writes an `ai_generation_logs` row (status, post link, model, tokens,
  duration, error) visible under AI Content → generation logs. Missing API key logs a
  SKIPPED run rather than failing silently.
- Generated HTML is sanitized to a strict allowlist before storage; the post appears in
  the normal Posts module for review/editing like any other post.

Roles: `ADMIN`, `EDITOR`, `AUTHOR`, `VIEWER` — enforced server-side on every mutating Server Action; every mutation writes an `audit_logs` row.

## Database

- `prisma/schema.prisma` is the source of truth.
- `scripts/migrate-legacy.mjs` migrates `legacy_*` tables → new schema (idempotent):
  ```
  NODE_OPTIONS="--conditions=react-server" npx tsx scripts/migrate-legacy.mjs
  ```
- Neon branches: `main` = production data, `development` = safe dev clone.

## Deployment (Vercel)

1. In the Vercel dashboard, import `alirezakiaee/alirezakiaee-portfolio` (or `vercel link` + `vercel --prod`).
2. Set env vars on the project: `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `ADMIN_SETUP_KEY`, `APP_URL`, and `BLOB_READ_WRITE_TOKEN` for the media library.
3. The build command is `prisma generate && next build` — no extra config needed.
4. Point `alirezakiaee.com` / `www.alirezakiaee.com` at the project.

## Verification

```bash
npm run typecheck   # tsc --noEmit
npm test            # vitest unit tests
npm run build       # production build
```

## Security notes

- Session cookie `ak_admin`: httpOnly, Secure, SameSite=Strict, signed JWT (7-day expiry).
- Login is rate-limited per identifier and locks after 5 failed attempts / 15 min (`auth_attempts`).
- Setup endpoint requires `ADMIN_SETUP_KEY` — remove/rotate it after enrolling.
- Post content and richText page blocks are sanitized with `sanitize-html` before storage.
- Public-path DB redirects are enforced in edge middleware (60s cache, fail-open).
