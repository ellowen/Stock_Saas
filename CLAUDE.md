# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GIRO is a multi-tenant SaaS for clothing inventory management and point-of-sale (POS). It supports multiple companies, each with multiple branches, users (OWNER/MANAGER/SELLER roles), products with variants (size/color/SKU), and stock tracking.

## Commands

### Backend (`cd backend`)
```bash
npm run dev          # Dev server on http://localhost:4000 (ts-node-dev)
npm run build        # TypeScript compilation to dist/
npm start            # Run compiled JS
npm test             # Jest tests
npm run test:watch   # Jest watch mode
npx prisma migrate dev            # Run pending migrations
npx prisma migrate dev --name X   # Create + run a new migration
npx prisma studio                 # GUI to browse the DB
npm run seed                      # Seed DB with demo data (owner@example.com / password123)
```

### Frontend (`cd frontend`)
```bash
npm run dev          # Vite dev server on https://localhost:5173
npm run build        # Production build
npm run lint         # ESLint
npm run preview      # Preview production build
npm test             # Vitest
npm run test:watch   # Vitest watch mode
```

### Running a single test
```bash
# Backend - Jest
cd backend && npx jest src/__tests__/auth.test.ts

# Frontend - Vitest
cd frontend && npx vitest run src/components/Foo.test.tsx
```

## Architecture

### Multi-tenancy model
Every DB query is scoped by `companyId`. A `Company` has many `Branch`es and `User`s. Products, inventory, and sales all belong to a company and optionally a branch.

### Backend layers (`backend/src/`)
```
config/         env vars, DB client
domain/         pure domain types/logic (currently users)
application/    use-cases per feature (analytics, auth, inventory, products, sales, transfers)
infrastructure/ Prisma DB access, email (Nodemailer)
infrastructure/http/middleware/   auth JWT, validation (Zod), error handling
infrastructure/http/routers/      Express route definitions
presentation/http/controllers/    Request/response handlers
```
Each feature module (e.g. `sales`) has its own router, controller, and application-layer service. Add a feature by creating files in all four layers and registering the router in `app.ts`.

### Frontend structure (`frontend/src/`)
- **`pages/`** - one file per route; large pages (InventoryPage, SalesPage, ReportsPage) contain most of their own logic
- **`contexts/`** - `AuthContext` (JWT + user state), `ToastContext`, `ThemeContext`
- **`layout/AppLayout.tsx`** - shell for all `/app/*` routes with sidebar navigation
- **`components/ProtectedRoute.tsx`** - redirects unauthenticated users
- **`lib/`** - shared utilities and API helpers
- **`i18n/locales/`** - Spanish/English translation files

### API base URL
The Vite dev server proxies `/api` to `http://localhost:4000`. In production the frontend is served statically and hits the backend directly.

### Auth flow
- JWT access token (15 min) + refresh token (7 days)
- Password reset sends an email via Nodemailer; in dev the token is printed to console if SMTP is not configured
- Role checks are enforced in backend middleware

### Database
Prisma with MySQL. Key models: `Company`, `Branch`, `User`, `Product`, `ProductVariant`, `Inventory`, `InventoryMovement` (audit log), `Sale`, `SaleItem`, `StockTransfer`, `PasswordResetToken`.

### Environment
Copy `backend/.env.example` to `backend/.env`. Required vars: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`. SMTP vars are optional (tokens logged to console if absent).

---

## Output
- Answer is always line 1. Reasoning comes after, never before.
- No preamble. No "Great question!", "Sure!", "Of course!", "Certainly!", "Absolutely!".
- No hollow closings. No "I hope this helps!", "Let me know if you need anything!".
- No restating the prompt. If the task is clear, execute immediately.
- No explaining what you are about to do. Just do it.
- No unsolicited suggestions. Do exactly what was asked, nothing more.
- Structured output only: bullets, tables, code blocks. Prose only when explicitly requested.

## Token Efficiency
- Compress responses. Every sentence must earn its place.
- No redundant context. Do not repeat information already established in the session.
- No long intros or transitions between sections.
- Short responses are correct unless depth is explicitly requested.

## Typography - ASCII Only
- No em dashes (-) - use hyphens (-)
- No smart/curly quotes - use straight quotes (" ')
- No ellipsis character - use three dots (...)
- No Unicode bullets - use hyphens (-) or asterisks (*)
- No non-breaking spaces

## Sycophancy - Zero Tolerance
- Never validate the user before answering.
- Never say "You're absolutely right!" unless the user made a verifiable correct statement.
- Disagree when wrong. State the correction directly.
- Do not change a correct answer because the user pushes back.

## Hallucination Prevention
- Never speculate about code, files, or APIs you have not read.
- If referencing a file or function: read it first, then answer.
- If unsure: say "I don't know." Never guess confidently.
- Never invent file paths, function names, or API signatures.
- If a user corrects a factual claim: accept it as ground truth for the entire session. Never re-assert the original claim.

## Code Output
- Return the simplest working solution. No over-engineering.
- No abstractions or helpers for single-use operations.
- No speculative features or future-proofing.
- No docstrings or comments on code that was not changed.
- Inline comments only where logic is non-obvious.
- Read the file before modifying it. Never edit blind.

## Warnings and Disclaimers
- No safety disclaimers unless there is a genuine life-safety or legal risk.
- No "Note that...", "Keep in mind that...", "It's worth mentioning..." soft warnings.
- No "As an AI, I..." framing.

## Session Memory
- Learn user corrections and preferences within the session.
- Apply them silently. Do not re-announce learned behavior.
- If the user corrects a mistake: fix it, remember it, move on.

## Scope Control
- Do not add features beyond what was asked.
- Do not refactor surrounding code when fixing a bug.
- Do not create new files unless strictly necessary.

## Override Rule
User instructions always override this file.
