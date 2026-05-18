# Outfittr

Social wardrobe app — upload, organize, share, and rank outfits. A digital
closet with head-to-head rankings and social discovery.

Built as a single Cloudflare Worker: a Hono API + a React (Vite) frontend,
backed by D1, R2, KV, Workers AI, and Vectorize.

## Running locally

```bash
npm install
cp .dev.vars.example .dev.vars
npm run db:migrate:local
npm run dev
```

Set `ACCESS_DEV_EMAIL` in `.dev.vars` to pick the local dev user.
