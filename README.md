# Outfittr

Outfittr is a social wardrobe app for uploading, organizing, sharing, and ranking outfits.
Think of it as a digital closet with head-to-head rankings, social discovery, and AI-powered style insights.

## Features

### Digital closet

- Upload outfit photos and organize them into collections
- Tag garments with a brand, store, item name, price, size, and position on the photo
- Tap outfit photos to reveal interactive garment pins
- Edit outfits, update tags, create AI cutouts, or remove looks
- Filter the closet by aesthetic and occasion

### Outfit rankings

- Compare two outfits head to head
- Build separate Elo leaderboards for overall style, aesthetics, and occasions
- Complete a guided ranking flow after every upload
- Continue ranking outfits at any time

### Social features

- Follow people and browse following or trending feeds
- Support public accounts and private follow requests
- Like, comment, save, and leave hype reactions
- View profiles, followers, following lists, and shared outfits
- Calculate style compatibility from shared brands, aesthetics, and semantic similarity

### Style intelligence

- Generate a Style DNA summary from wardrobe data
- Show favorite brands, aesthetic percentages, color palette, and styling trends
- Ask an AI stylist questions using outfits from your actual closet
- Search people, brands, and outfits across the world, followed accounts, or your closet
- Combine keyword search with Vectorize semantic search
- Auto-suggest outfit metadata and garment tags from a photo

### Community challenges

- Join weekly style prompts or create a community challenge
- Enter an outfit from your closet
- Vote in head-to-head challenge matchups
- Climb a challenge-specific Elo leaderboard

## Built With

| Technology | Usage |
| --- | --- |
| React, TypeScript, Vite | Mobile-first frontend |
| Cloudflare Workers | API and static application hosting |
| Cloudflare Access | Authentication and account identity |
| D1 and Drizzle | Relational application data |
| R2 and Cloudflare Images | Original photos and optimized delivery |
| Workers AI | Photo analysis, Style DNA, cutouts, and AI stylist |
| Vectorize | Semantic outfit discovery |
| AI Gateway | AI request caching and observability |
| Workers KV | Feed and leaderboard caching |

## Local Development

Requirements: Node.js 22+ and a Cloudflare account for remote AI services.

```bash
npm install
cp .dev.vars.example .dev.vars
npm run db:migrate:local
npm run dev
```

Set `ACCESS_DEV_EMAIL` in `.dev.vars` to choose the local development user. Change it and restart the app to simulate another account.

Workers AI, Images, and Vectorize features require their corresponding Cloudflare bindings. The app uses deterministic fallbacks where possible when AI services are unavailable.

## Cloudflare Access

Production authentication is handled at the edge by Cloudflare Access. The Worker verifies the Access JWT and automatically creates a Rackd profile on first login.

Before deploying:

1. Create a self-hosted Access application for the Worker URL.
2. Add an Access policy.
3. Configure `TEAM_DOMAIN` and `POLICY_AUD`.
4. Replace the placeholder resource IDs in `wrangler.jsonc`.
5. Apply all D1 migrations before deploying.

## Commands

```bash
npm run dev                 # Start local development
npm run build               # Type-check and build
npm run db:migrate:local    # Apply local D1 migrations
npm run db:migrate:remote   # Apply remote D1 migrations
npm run deploy              # Build and deploy the Worker
```

## Architecture

The React application and Hono API are deployed together as one Cloudflare Worker. Static assets are served through Workers Static Assets, while authenticated API routes use D1, R2, KV, Workers AI, and Vectorize bindings.

Outfit media is served through an authenticated Worker route so private-account photos remain protected.
