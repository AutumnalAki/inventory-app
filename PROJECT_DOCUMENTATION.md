# LabTrack — Project Documentation (Factual Overview)

## Site content
- Inventory management (add, edit, track items)
- Reservations and access codes
- Members / user management and roles
- Activity logs and update history
- Reporting and export (CSV/PDF)
- Dashboard with pages under `src/app/dashboard/`

## Frontend
- Framework: Next.js (App Router) with React and TypeScript
- Styling: TailwindCSS
- Key client files and folders:
  - `src/app/` — app routes and pages (entry points: `layout.tsx`, `page.tsx`)
  - `src/components/` — UI components (e.g., `ChatBot.tsx`, `Onboarding.tsx`)
  - `src/context/` — React contexts (`InventoryContext.tsx`, `RoleContext.tsx`, `ThemeContext.tsx`, `PopupContext.tsx`)
  - `src/lib/supabase.ts` — Supabase client used by client code (uses `NEXT_PUBLIC_*` env vars)

## Backend
- Server runtime: Next.js route handlers (server functions) under `src/app/api/`
- Database: Postgres (Supabase-managed). Migrations located in `migrations/`.
- Key server files:
  - `src/app/api/ai/rank/route.ts` — AI ranking/response endpoint (reads multiple DB tables)
  - `src/app/api/delete-user/route.ts` — Deletes Supabase Auth users (uses service role key)
  - `src/app/api/dev/generate-demo-user/route.ts` — Dev-only demo user creation helper
  - Other API route files under `src/app/api/` for development utilities

## APIs (endpoints)
- `POST /api/ai/rank` — Accepts `prompt`; queries DB tables and returns AI-generated response (requires server-side API keys)
- `POST /api/delete-user` — Accepts `{ authId }`; deletes a user from Supabase Auth (requires service role key, server-side)
- `POST /api/dev/generate-demo-user` — Creates demo accounts for development (validates caller role)
- Additional dev-only endpoints under `src/app/api/dev/*`

## Third-party services
- Supabase — Auth, Postgres database, realtime
- Google Generative AI (Gemini) — LLM used by `/api/ai/rank`; env `GEMINI_API_KEY`, optional `GEMINI_MODEL`
- Google Custom Search (optional) — `GOOGLE_SEARCH_API_KEY`, `GOOGLE_SEARCH_CX` used as fallback in AI route
- PWA assets — `public/manifest.json`, `public/sw.js`

## Dependencies (selected, from `package.json`)
- Runtime libraries:
  - `next` (Next.js)
  - `react`, `react-dom`
  - `@supabase/supabase-js`
  - `@google/generative-ai`
  - `framer-motion`, `lucide-react`, `clsx`
  - `xlsx`, `jspdf`, `jspdf-autotable`, `file-saver`
- Dev / build:
  - `typescript`, `tailwindcss`, `postcss`, `autoprefixer`, `eslint`, `@types/*`
