# My Sports Diary

A personal sports game diary PWA. Track every game you attend — scores, seats, vibes, photos, and memories.

## Tech stack

React 18 · Vite · TypeScript · Tailwind CSS v4 · Supabase · PWA (vite-plugin-pwa)

## Local development

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
# Then edit .env and fill in your Supabase URL and anon key
```

Required variables:

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL (e.g. `https://xxxx.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase project's anon/public key |

Find these in the Supabase dashboard → Project Settings → API.

### 3. Run the dev server

```bash
npm run dev
```

### 4. Build for production

```bash
npm run build
```

## Database

SQL migrations live in `supabase/migrations/`. Run them in order in the Supabase SQL editor to set up the schema.

## Deployment

This app is deployed on Vercel. The same env vars above must be set in the Vercel dashboard:

1. Go to your project on vercel.com
2. Settings → Environment Variables
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (available to all environments, or scope per environment as needed)
4. Redeploy for the changes to take effect
