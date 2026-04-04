# AGENTS.md — G11 Fantasy League

## Commands

```bash
npm run dev      # Start dev server (Next.js 16 + Turbopack)
npm run build    # Production build (verifies compilation)
npm run start    # Run production build locally
npm run lint     # Run ESLint (next/core-web-vitals + next/typescript)
```

**No test framework is configured.** There are no test files in the repo. If adding tests, use `npm install -D jest @testing-library/react @testing-library/jest-dom` and follow Next.js testing conventions.

**Type checking:** `npx tsc --noEmit` — note that `next.config.ts` sets `ignoreBuildErrors: true`, so the build won't fail on type errors. Always run `tsc --noEmit` manually to catch them.

**Stale build lock:** If `npm run build` says "Another next build process is already running", remove `.next/.next-build-lock` or kill stale node processes.

**Scripts:** Node.js scripts in `scripts/` require `dotenv` for env loading. They read from `.env.local` and use `SUPABASE_SECRET_KEY` (not `SUPABASE_SERVICE_ROLE_KEY`).

## Project Structure

```
kbl-v3/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── dashboard/          # Main dashboard (server component)
│   │   ├── user/[user_id]/     # User profile page with rank chart + match history
│   │   ├── match/[match_id]/   # Match standings
│   │   ├── team/[match_id]/    # Team builder/draft
│   │   ├── admin/              # Admin match management + score calculation
│   │   ├── login/              # Auth (email + Google OAuth)
│   │   ├── api/                # API routes (rescore, cron)
│   │   ├── layout.tsx          # Root layout (TopNav + ThemeToggle)
│   │   └── globals.css         # All styles (no CSS modules)
│   ├── components/             # Shared React components
│   ├── utils/supabase/         # Supabase client (server + client + admin)
│   └── data/                   # Static data (cricbuzz_ids.json)
├── supabase/
│   ├── schema.sql              # DB schema
│   └── migrations/             # SQL migrations (001–004)
└── scripts/                    # One-off scripts (backfill-global-ranks.mjs, backfill-match-global-ranks.mjs)
```

## Architecture

- **Next.js 16.2.1** with App Router, Turbopack
- **React 19** — Server Components by default, `'use client'` for interactivity
- **Supabase** — PostgreSQL + Auth via `@supabase/ssr` (cookie-based sessions)
- **Recharts** — Charting library (user profile rank history, composed chart with bars + line)
- **Lucide React** — Icon library
- **No Tailwind, no CSS-in-JS, no component library** — plain CSS custom properties + inline styles

## Code Style

### Imports
- Use `@/` path alias for `src/` (e.g., `import { NavButton } from '@/components/NavButton'`)
- Group imports: Next.js/React first, then third-party, then local `@/` imports
- Named imports preferred over default (except for page components and React)

### Formatting
- 2-space indentation (TypeScript/JSX)
- Semicolons at end of statements
- Single quotes for strings in JSX attributes, double quotes in JS/TS logic
- Arrow functions for components: `export function ComponentName() { ... }`
- No trailing commas in function parameters, yes in arrays/objects

### Types
- `strict: true` in tsconfig — no implicit `any`
- Avoid `any` — use `unknown` or proper types. Existing code has `any` on Supabase query results; prefer typed interfaces for new code
- Supabase query results are untyped by default — cast with `as` or define interfaces
- Component props: use inline type annotations or `type`/`interface` declarations
- Server components: params are `Promise<{ param: string }>` in Next.js 16

### Naming Conventions
- **Components:** PascalCase (`RankChart`, `TeamLogo`, `NavButton`)
- **Files:** PascalCase for components (`RankChart.tsx`), lowercase for pages (`page.tsx`), kebab-case for utilities
- **CSS classes:** kebab-case (`.match-card`, `.scoreboard-row`, `.section-header`)
- **CSS variables:** kebab-case with `--` prefix (`--accent-glow`, `--card-hover`)
- **Variables/functions:** camelCase
- **Constants:** UPPER_SNAKE_CASE

### Error Handling
- Server components: use `redirect()` from `next/navigation` for auth guards
- Use `notFound()` for missing resources (e.g., user profile not found)
- Supabase errors: check `error` field on query results, log with `console.error`
- No try/catch in server components unless wrapping external API calls
- Client components: rely on React error boundaries (none configured yet)

### Styling
- **All styles live in `globals.css`** — no CSS modules, no styled-components
- CSS custom properties in `:root` for theming, `[data-theme='light']` for light mode
- Inline `style={{}}` props are the dominant pattern for component-specific styles
- Mobile responsive via `@media (max-width: 600px)` in globals.css
- Design system: "Stadium Noir" — dark charcoal (#0a0a0c) + amber (#f0a500) accent
- Fonts: Space Grotesk (headings) + IBM Plex Sans (body) via `next/font/google`

### Server vs Client Components
- **Default to Server Components** — no `'use client'` directive
- Use `'use client'` only when: state (`useState`), effects (`useEffect`), event handlers, browser APIs, or client-only libraries (Recharts)
- Server components fetch data, client components render charts/interactivity
- Data fetching: always server-side via Supabase SSR client

### Database

**Key tables:**
- `profiles` — user accounts with `total_points` (cumulative)
- `matches` — match metadata with `status` (upcoming/live/completed)
- `user_match_ranks` — per-match scores: `raw_score`, `relative_rank`, `relative_points`
- `user_global_rank_history` — global leaderboard position per match (computed after scoring)
- `player_scores` — individual player fantasy points per match
- `user_teams` — user's drafted team per match

**Score calculation pipeline** (`src/app/admin/actions.ts` → `calculateScoresFromCricbuzz`):
1. Scrapes Cricbuzz scorecard HTML
2. Computes fantasy points for each player (batting, bowling, fielding)
3. Sums user team scores with captain (x2) and vice-captain (x1.5) multipliers
4. Computes relative rankings with tie-breaking
5. Upserts `user_match_ranks` and updates `profiles.total_points`
6. **Computes global ranks** by sorting all profiles by `total_points` and upserting into `user_global_rank_history` for that match

**Global rank computation:**
- Incremental: after each match is scored, ranks are computed for that specific match only
- Based on `profiles.total_points` at the time of scoring
- Stored in `user_global_rank_history(user_id, match_id, global_rank)`
- SQL function `compute_global_ranks()` exists for full historical rebuilds (migration 004)

**Migrations:** run manually via Supabase SQL Editor
- `001_add_global_rank.sql` — (deprecated, column removed)
- `002_backfill_global_ranks.sql` — calls `compute_global_ranks()`
- `003_user_global_rank_history.sql` — creates the global rank history table
- `004_compute_global_ranks_function.sql` — PL/pgSQL function for full rebuild

**Backfill scripts:** run with `node scripts/<name>.mjs` (reads `.env.local` via dotenv)
- `backfill-global-ranks.mjs` — full historical backfill for all matches
- `backfill-match-global-ranks.mjs <match_id>` — backfill global ranks for a single match

### Navigation
- Use `Link` from `next/link` for client-side navigation
- Use `redirect()` from `next/navigation` for server-side redirects (auth guards)
- Use `useRouter()` + `router.push()` for programmatic navigation in client components
- `NavButton` component wraps navigation with loading state

### Theme Toggle
- Dark/light theme via `data-theme` attribute on `<html>`
- Persisted in `localStorage`
- CSS variables swap between `:root` (dark) and `[data-theme='light']`

### Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — anon/public key
- `SUPABASE_SECRET_KEY` — secret key (used by admin client and scripts)
