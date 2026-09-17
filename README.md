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

Generate secrets: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

## Admin

Admin lives at **`/vorudealireza`**.

1. Visit `/vorudealireza/setup` once with `ADMIN_SETUP_KEY` to create the first admin and enroll an Authenticator app (TOTP).
2. Log in at `/vorudealireza/login` — password first, then the 6-digit Authenticator code.
3. Modules: Pages (block editor), Blog Posts (categories/tags, sanitized HTML), Projects (case studies), Services, Testimonials, Technologies, Media Library, Navigation (header/footer menus), Settings, Redirects, Users, Audit Log.

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
