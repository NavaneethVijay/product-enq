# AGENTS.md: Instructions for AI coding agents

Read this file fully before doing anything. Then read `docs/PLAN.md`. Together they define the whole scope.

## 1. What this project is

A **product catalogue proof of concept** built for a take-home challenge (*Code Challenge – AI-Native Engineer*). Customers browse and search products (from the Fake Store API, via our backend) and send an enquiry email to a sales inbox. It must be a **foundation that can grow**, not a throwaway. The **product data source, look and feel, and email provider** are expected to change.

Reviewers assess **judgement, not feature count**: solution design, assumptions, implementation quality, testing, and AI engineering practice.

## 2. Sources of truth (in this order)

1. `docs/PLAN.md`: scope, API contract, acceptance criteria mapping, assumptions, cuts, test plan, schedule. Its **Appendix** quotes the brief verbatim.
2. `DECISIONS.md`: final record of assumptions, cuts, growth path and next steps.
3. This file: how to work.

**If something is not in `docs/PLAN.md`, it is out of scope.** Do not invent endpoints, pages, fields, features or dependencies. If a task seems to need something not in the plan, **stop and ask** instead of guessing. If scope changes are agreed, update `docs/PLAN.md` and `DECISIONS.md` **before** writing code.

## 3. Fixed stack (confirmed, do not change)

- **Frontend:** React + TypeScript + Vite (`frontend/`)
- **Backend:** Node.js + Express + TypeScript (`backend/`)
- **Validation:** Zod · **Email:** Nodemailer → Mailpit locally · **Tests:** Vitest + Supertest
- **Local run:** Docker Compose with `web`, `api`, `mailpit`

Do not add frameworks (Next.js, NestJS, ORMs, state libraries, UI kits, CSS frameworks) or a database. Prefer the standard library and small, well-known packages. Justify any new dependency in `DECISIONS.md`.

## 4. Architecture rules (non-negotiable)

1. **The client never calls Fake Store.** The frontend only calls `/api/*` on our backend.
2. **Ports and adapters in the backend:**
   - `ports/ProductRepository.ts`: `getAll()`, `getById(id)`, `getCategories()`. Returns our domain `Product` (`id` is a `string`).
   - `ports/EmailProvider.ts`: `send({ to, replyTo, subject, text, html })`.
   - Only `adapters/` may know about Fake Store or SMTP. Services depend on ports, never on adapters.
3. **Single wiring point:** `createApp({ productRepo, emailProvider, config })` in `app.ts`. `server.ts` passes real adapters; tests pass fakes. No module-level singletons for adapters.
4. **Routes are thin:** parse and validate with Zod, call a service, map the result to HTTP. Business logic (featured, category split, search, enquiry) lives in `services/`.
5. **Errors:** throw typed errors (e.g. `NotFoundError`, `ValidationError`, `UpstreamError`). One `errorHandler` middleware maps them to `{ error: { code, message } }`. Never leak stack traces.
6. **Frontend:** pages and hooks fetch data. Components in `components/` are **props-only** (no fetching). All colours, fonts and spacing come from CSS variables in `theme.css`.
7. **Configuration:** read env only in `backend/src/config.ts` (validated with Zod). Every variable must also appear in `.env.example`.

## 5. Coding conventions

- TypeScript `strict: true`. No `any` without a comment explaining why.
- Small files, named exports, descriptive names. No dead code or commented-out code.
- Validate every external input: route params, query strings, request bodies, env vars, and Fake Store responses.
- Security basics: no secrets in code; CRLF/HTML-safe values in emails; `Reply-To` is the customer, `From` is `SMTP_FROM`; request body size limit; CORS not needed (Vite proxy).
- Every UI data view handles **loading, empty, error and not-found** states.
- Keep it simple. If you add an abstraction, it must protect one of the three expected changes (data source, email provider, look and feel).

## 6. Testing rules

- Backend tests live in `backend/src/__tests__/` and run offline: use fakes through `createApp(deps)` and mock `fetch` in adapter tests.
- Every route and service change comes with a test. The critical-path tests listed in `docs/PLAN.md` §10 must stay green.
- Run `npm test` (and typecheck) before saying a task is done. Report failures honestly; never delete or skip a test to make it pass.

## 7. Workflow

- Work on branch `feat/product-catalogue`; the PR into `main` stays open. Commit in small, meaningful steps.
- Follow the phase order in `docs/PLAN.md` §11. Update the **Status** table below when a phase starts or finishes.
- When the AI (you) gets something wrong and it is caught, or a prompt meaningfully shapes the solution, add an entry to `AI_USAGE.md`.
- When an assumption or cut changes, update `DECISIONS.md` in the same change.
- Never commit `.env`, secrets, or the brief PDF.

## 8. Status

| Phase (PLAN §11) | Status | Notes |
| :--- | :--- | :--- |
| 0. Planning (plan, AGENTS.md, docs skeletons) | Done | `docs/PLAN.md`, `AGENTS.md`, `CLAUDE.md`, `DECISIONS.md`, `AI_USAGE.md` created. No code yet; git repo not yet initialised. |
| 1. Setup & guardrails | Not started | |
| 2. Backend | Not started | |
| 3. Backend tests | Not started | |
| 4. Frontend | Not started | |
| 5. Docker | Not started | |
| 6. Review & docs, open PR | Not started | |
