# GRIT — Performance OS

**Train like Runna. Track like Strava. Coach like MacroFactor.**

An all-in-one training + nutrition + social platform that merges adaptive training plans,
activity tracking, evidence-based nutrition coaching, and a social feed into a single
data-rich dashboard.

**Live:** https://gritier.attridevv.com

![GRIT](https://attridevv.com/assets/work/grit.jpg)

## Stack

- **Next.js 16** (App Router, Turbopack)
- **Clerk v7** — authentication
- **Prisma 7** + `@prisma/adapter-pg` — ORM
- **Neon / Supabase Postgres** — database
- **Tailwind CSS v4** — styling
- **Recharts** — data visualization
- **Framer Motion** — micro-animations
- **Lucide** — icons

## Features

| Area | Description |
|---|---|
| Dashboard | MacroFactor-style tile dashboard: readiness gauge, trends, training load, nutrition, plan compliance |
| Training | Run + strength logging, pace/HR charts, volume tracking, 1RM estimates |
| Plans | Runna-style adaptive plans with mesocycles, race targeting, compliance tracking |
| Nutrition | Adaptive macro coaching: TDEE estimation, weight trends, weekly adjustments, meal logging |
| Analytics | ACWR, training load, sleep, athlete radar, race predictions |
| Insights | AI coaching reports (OpenAI, with rule-based fallback) |
| Feed | Strava-style social feed with kudos and comments |

## Analytics Engines

- **Readiness** — sleep, HR recovery, energy, soreness, pain, training recovery → 0-100 + zone
- **Training Load** — session load, ACWR, acute/chronic loads, fatigue index
- **Injury Risk** — per-location risk with mobility, ACWR, and injury-history multipliers
- **Race Prediction** — Riegel formula + VO2 max estimation
- **Adaptive Plan** — adjusts volume/intensity from readiness, ACWR, compliance, phase
- **Nutrition Coaching** — TDEE estimation from weight + intake trends, adaptive macro targets

## Getting Started

```bash
npm install

# configure environment
cp .env.example .env
# fill in DATABASE_URL + Clerk keys

# push schema + seed demo data
npx prisma generate
npx prisma db push
npm run db:seed

npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

```
DATABASE_URL=postgresql://...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
OPENAI_API_KEY=          # optional — falls back to rule-based insights
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

Built by [Dev Attri](https://attridevv.com).
