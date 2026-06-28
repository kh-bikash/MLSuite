# ML Inspector AI — Build Plan

A request this large can't ship as one production-ready enterprise SaaS in a single pass (the spec describes months of work across FastAPI, Celery, Postgres, 5 AI pipelines, billing, OAuth, exports, tests, CI/CD). I'll build it iteratively on the stack this project actually runs: **TanStack Start + Lovable Cloud** (not Next.js/FastAPI — swapping stacks isn't possible here). All five apps will share auth, projects, storage, and navigation, with real AI via Lovable AI Gateway.

## Phase 1 — Foundation (this iteration)

**Design system (Apple-minimal, light theme)**

- Off-white background, near-black text, single restrained accent, generous whitespace
- SF-style typography (Inter Tight + Inter), soft shadows, large radii, subtle glass on overlays only
- No dark mode (per your instruction), no purple gradients
- Tokens in `src/styles.css`; shadcn variants — never hardcoded colors

**App shell**

- Marketing landing (`/`) introducing the 5 products
- Authenticated workspace shell with sidebar: Dashboard + 5 apps + Reports/Settings
- Command palette (⌘K), global search, breadcrumb header
- Framer Motion page transitions

**Auth & data (Lovable Cloud)**

- Email/password + Google sign-in, `/auth` and `/reset-password` routes
- `_authenticated` route gate
- Schema: `profiles`, `user_roles` (with `has_role`), `organizations`, `projects`, `files`, `reports`, `notifications`, `activities`, `api_keys`
- Per-app tables: `experiment_runs`, `dataset_audits`, `rag_sessions`, `model_cards`, `prompt_suites`/`prompt_runs`/`prompt_results`
- RLS on every table, GRANTs included

**Dashboard**

- Real counts from user's projects/runs/reports, recent activity, quick actions into each app

## Phase 2 — App 1: Experiment Failure Analyst

Upload logs (txt/csv/json), parse metrics, AI root-cause via Lovable AI (`google/gemini-3-flash-preview`), loss/accuracy charts (Recharts), repair checklist, PDF/MD/JSON export.

## Phase 3 — App 2: Dataset Bias Auditor

CSV/JSON upload, client-side stats (missing, duplicates, imbalance, correlation), AI-assisted protected-attribute detection, fairness metrics, heatmaps, exportable report.

## Phase 4 — App 3: RAG Pipeline Debugger

Form for question/chunks/answer, AI grounding + hallucination analysis, chunk ranking visualization, similarity heatmap, recommendations.

## Phase 5 — App 4: Model Card Generator

Guided form, live MD/HTML preview, AI-drafted sections, export MD/JSON/HTML/PDF, version history.

## Phase 6 — App 5: Prompt Regression Tester

Suites with cases, run against Lovable AI models, semantic-similarity + LLM-judge scoring, leaderboard, regression diff vs prior run.

## Phase 7 — Polish

Notifications center, activity log, API keys UI, billing-ready stub, exports unified, empty/error/loading states, accessibility pass.

## Technical notes (for the engineers in the room)

- Stack is fixed: TanStack Start (React 19, Vite 7), Tailwind v4, shadcn, Lovable Cloud (Supabase under the hood), Lovable AI Gateway. FastAPI/Celery/Next.js can't be added.
- Heavy ML libs (SHAP, BERTScore, FAISS) don't run in the browser or Worker SSR — bias/RAG analytics use pragmatic JS equivalents + LLM reasoning, which is what production AI-eng tools mostly do anyway.
- Real auth, real DB, real AI, real exports. No mocks.
- Each phase ends in a shippable, working slice.

## What I need from you before starting

1. **Confirm the phased approach** — I'll build Phase 1 now (design system + shell + auth + DB + dashboard), then we iterate app-by-app. Trying to one-shot all 5 apps would produce shallow, broken features.
2. **Accent color** — Apple-minimal works with: (a) classic graphite/black-only, (b) a single blue accent (#0071e3-ish), or (c) a warm accent (terracotta/sage). Which?
3. **Google OAuth** — enable now or email/password only for Phase 1?
