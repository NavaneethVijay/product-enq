# Plan & Spec: Product Catalogue PoC

> **Source of truth for scope.** This file combines the spec (what to build: acceptance criteria, API contract, assumptions) and the plan (how and in what order). It captures everything in the original brief, *Code Challenge – AI-Native Engineer* (PDF, not committed). The brief's acceptance criteria, constraints and deliverables are quoted verbatim in the **Appendix**.
>
> **Rules for anyone (human or AI) using this file:**
> - If something is not in this file or the Appendix, it is **out of scope**. Do not invent requirements, endpoints, pages or fields.
> - Changing scope, an assumption or the API contract means updating this file **and** `DECISIONS.md` first, then the code.
> - Agent working rules live in `AGENTS.md`.

## 0. Goal & Guiding Principle

Build a **small, well-reasoned** product catalogue PoC that the entrepreneur can click through, and that is a **foundation, not a throwaway**. The brief names three things that *will* change:

| Expected change | Seam that absorbs it |
| :--- | :--- |
| Product data source (Fake Store → DB / ERP) | `ProductRepository` port + adapter |
| Email provider (local → SES / other) | `EmailProvider` port + adapter |
| Look and feel (creative work in progress) | CSS-variable theme + presentational (props-only) components |

**Rule:** add a seam only where the brief predicts change. Everything else stays simple and is documented as a deliberate cut. Judgement is assessed, not feature count.

### How the submission is assessed (from the brief)

| Area | What reviewers look for |
| :--- | :--- |
| Solution design | A structure that can grow beyond the PoC: clear boundaries between frontend, backend and the product data source. |
| Decision-making and assumptions | Sensible assumptions where the criteria are unclear, clear trade-offs, justified cuts. |
| Implementation quality | Readable, consistent code with sensible error handling, validation and security basics. |
| Testing | Tests that cover the critical path and give confidence to change the code. |
| AI engineering practice | Effective direction of AI tools, critical review of their output, ownership of the result. |

Shortlisted candidates get a 45-minute follow-up to walk through the submission and **make a small change live**. Every line must be explainable.

### In scope / out of scope (summary)

* **In scope:** React web client, Node/Express API, the 5 acceptance criteria (Home, Category, Search, Product page, Enquiry), Docker Compose local run, backend tests, the required docs.
* **Out of scope:** database, auth/admin UI, cart/checkout/payments, user accounts, pagination, native mobile app, deployed infrastructure, rate limiting/CAPTCHA, i18n. These are documented as cuts or next steps (§8, §13), not built.

---

## 1. Tech Stack & Justification (goes in README)

| Layer | Choice | Why |
| :--- | :--- | :--- |
| Client | **React + TypeScript (Vite)** | TypeScript preferred by brief; Vite = fast startup, minimal config; component model suits an upcoming rebrand. |
| Backend | **Node.js + Express + TypeScript** | TypeScript preferred by brief; same language across stack; Express is small, well known, easy to defend. |
| Validation | **Zod** | Runtime validation at the API boundary with inferred TS types. |
| Email (local) | **Nodemailer → Mailpit** | Real SMTP flow with a browser inbox at `localhost:8025`; no paid service or account (constraint 6). |
| Tests | **Vitest + Supertest** | Fast, TS-native, one runner for unit and HTTP tests. |
| Local infra | **Docker Compose** (`web`, `api`, `mailpit`) | One command run (constraint 4); containers map directly to AWS ECS/App Runner (constraint 3). |

### Why this stack, and why the simpler option

**Frontend: React + TypeScript + Vite.**
I chose a plain React single-page app because the PoC is a handful of read-heavy pages and one form. The brief says the look and feel is still being designed, so the frontend needs to be easy to restyle and replace. A plain component tree with a theme file does that with the least framework in the way. Vite gives near-instant startup and almost no configuration, which helps the reviewer's "running in under 10 minutes" experience.

*Why not something bigger:* Next.js adds server rendering, its own routing conventions and a server runtime. That overlaps with the separate backend the brief requires (constraint 2), and the PoC doesn't need SEO or server rendering yet. A native mobile app would be slower for reviewers to build and run. React web is the quickest way for the entrepreneur to click through the PoC, and the JSON API keeps a mobile client open for later.

**Backend: Node.js + Express + TypeScript.**
Express is small, widely known and has no hidden conventions, so every file is easy to read and to defend in the follow-up interview. TypeScript on both sides means one language and one toolchain, and the boundaries (ports, adapters, services) are expressed as plain TypeScript interfaces rather than framework features. That keeps the architecture visible in the code itself.

*Why not something bigger:* NestJS gives dependency injection and modules out of the box, but its decorators and boilerplate would take a large share of a 2–3 hour time-box. The ports-and-adapters split plus a single `createApp(deps)` function gives the same swappability in a few lines. Laravel would mean two languages across the stack. Fastify is a reasonable alternative but offers little benefit at this size and is less familiar to most reviewers.

**The principle behind the choice:**
The brief scores judgement, not feature count, and asks for "a small, well-reasoned solution". The simpler stack keeps the time on the parts that will actually change: the data source, the email provider and the look and feel. Nothing here blocks production. Express runs in a container on ECS or App Runner, the React build is static files served from S3 + CloudFront, and a heavier framework can be introduced later behind the same API if the product grows into it.

---

## 2. System Architecture

```text
Browser
  │
  ▼
[ web: React + Vite ] ──/api (Vite proxy)──▶ [ api: Express ]
  pages/  (fetch via hooks)                    routes/      thin HTTP + Zod validation
  components/ (props only)                     services/    CatalogService, EnquiryService
  theme.css (design tokens)                    ports/       ProductRepository, EmailProvider
                                               adapters/
                                                 FakeStoreRepository ──▶ fakestoreapi.com
                                                   └─ TTL cache + fallback to data/products.json
                                                 SmtpEmailProvider ────▶ Mailpit (SMTP :1025)
```

### Boundaries
1. **Client never calls Fake Store** (constraint 2). It only calls `/api/*` on our backend.
2. **`ProductRepository` (port):** `getAll()`, `getById(id)`, `getCategories()`. Returns *our* `Product` model (adapter maps Fake Store's shape; `id` is a `string` so future SKUs/UUIDs fit).
3. **`EmailProvider` (port):** `send({ to, replyTo, subject, text, html })`.
4. **Single wiring point:** `createApp({ productRepo, emailProvider, config })` in `app.ts`; `server.ts` passes real adapters, tests pass fakes. Swapping a data source or email provider = new adapter file + one line.
5. **Frontend:** pages own data fetching (`useProducts`, `useEnquiry`); components (`ProductCard`, `ProductGrid`, `SearchBar`, `EnquiryForm`) are props-only. Colours, fonts, and spacing live in `theme.css` as CSS variables.

---

## 3. Repository Layout

```text
<repo root>/
├── README.md                 # Stack choice + why, <10 min setup, config, how to test
├── DECISIONS.md              # Assumptions, cuts, growth path, next day
├── AI_USAGE.md               # Tools/models, agent files, plan, key prompts, AI mistakes
├── AGENTS.md                 # Agent instruction file (committed)
├── CLAUDE.md                 # Points Claude Code at AGENTS.md
├── docs/PLAN.md              # This plan + spec
├── docker-compose.yml        # web + api + mailpit
├── .env.example              # All config, no secrets
├── backend/
│   ├── Dockerfile
│   ├── data/products.json    # Fake Store snapshot (fallback + test fixture)
│   └── src/
│       ├── server.ts         # Composition: real adapters → createApp → listen
│       ├── app.ts            # createApp(deps): routes, error middleware
│       ├── config.ts         # Env parsing (Zod)
│       ├── domain/           # Product, Category, Enquiry types
│       ├── ports/            # ProductRepository.ts, EmailProvider.ts
│       ├── adapters/         # FakeStoreRepository.ts, SmtpEmailProvider.ts
│       ├── services/         # CatalogService.ts, EnquiryService.ts
│       ├── routes/           # products.ts, categories.ts, enquiries.ts
│       ├── middleware/       # errorHandler.ts
│       └── __tests__/
└── frontend/
    ├── Dockerfile
    └── src/
        ├── api/client.ts     # Typed fetch wrapper + API DTO types
        ├── hooks/            # useProducts, useEnquiry
        ├── components/       # ProductCard, ProductGrid, SearchBar, EnquiryForm, Header
        ├── pages/            # Home, Category, Search, ProductDetail, NotFound
        └── theme.css         # Design tokens (CSS variables)
```

---

## 4. Backend API Contract

| Method | Endpoint | Behaviour |
| :--- | :--- | :--- |
| `GET` | `/api/products/featured` | The 5 products listed in `FEATURED_PRODUCT_IDS`, in configured order. Unknown IDs skipped with a log warning. *(Registered before `/:id`.)* |
| `GET` | `/api/products?q=term` | Case-insensitive substring match on title, description, category. `q` trimmed; empty/missing `q` → `400`. |
| `GET` | `/api/products/:id` | Product details. Invalid id → `400`; not found → `404`. |
| `GET` | `/api/categories` | `[{ slug, name }]`, e.g. `{ slug: "mens-clothing", name: "men's clothing" }`. |
| `GET` | `/api/categories/:slug` | `{ category, topRated: Product[], additional: Product[] }`. Unknown slug → `404`. |
| `POST` | `/api/enquiries` | Body `{ productId, name, email, phone?, message? }` validated by Zod. Unknown product → `404`. Sends email to `SALES_INBOX_EMAIL`. Success → `202`; validation → `400`; email failure → `502`. |

Errors use one shape: `{ error: { code, message } }` from a central error middleware. No stack traces leak to clients.

---

## 5. Acceptance Criteria → Implementation

| AC | How it is met |
| :--- | :--- |
| **Home:** given I have chosen 5 "top rated" products, I see those 5 featured products | Owner's choice = `FEATURED_PRODUCT_IDS` (default in `.env.example`). Home page calls `/api/products/featured`, renders 5 `ProductCard`s. |
| **Category:** click category link → top rated + additional products | Category links in `Header` on every page (from `/api/categories`). Category page shows "Top rated" (top 3 by `rating.rate`) and "More in this category" (the rest). |
| **Search:** enter term, click search → only matching products | `SearchBar` submits on button click / Enter → navigates to `/search?q=term` → `/api/products?q=term`. Empty results show "No products match 'term'". |
| **Product page:** click product tile → details page | `ProductCard` links to `/products/:id` → `/api/products/:id`. Not found → `NotFound` page. |
| **Enquiry:** Enquire → contact form → submit → sales inbox gets email + customer sees "Thank you" | "Enquire" button on product page opens `EnquiryForm`. On `202`, the form is replaced by a "Thank you" message. Email visible in Mailpit at `localhost:8025`. On error, the message is shown and the form keeps its values. |

---

## 6. Technical Constraints Checklist

| # | Constraint | How it is satisfied |
| :--- | :--- | :--- |
| 1 | One client + one backend, choice and why in README | React (TS) + Node (TS); rationale in README (§1). |
| 2 | No Fake Store calls from client | Only `FakeStoreRepository` in the backend talks to Fake Store. |
| 3 | Infra compatible with AWS | Plain Docker images → ECS/App Runner; SMTP → SES; repository → RDS. |
| 4 | Run locally in <10 min, 1–2 commands | `cp .env.example .env && docker compose up --build`. A non-Docker fallback (`npm install && npm run dev` per app) is also documented. |
| 5 | No secrets committed | `.env` gitignored; `.env.example` only. |
| 6 | No paid services / reviewer accounts | Fake Store (public) + Mailpit (local). Snapshot fallback if Fake Store is unreachable. |

### `.env.example`
```
PORT=3000
FAKESTORE_BASE_URL=https://fakestoreapi.com
CACHE_TTL_SECONDS=300
FEATURED_PRODUCT_IDS=1,5,9,13,17
SMTP_HOST=mailpit
SMTP_PORT=1025
SMTP_FROM=catalogue@example.com
SALES_INBOX_EMAIL=sales@example.com
```

---

## 7. Assumptions (→ DECISIONS.md)

| Gap in the acceptance criteria | Assumption |
| :--- | :--- |
| How the owner "chooses" the 5 featured products | Config (`FEATURED_PRODUCT_IDS`). No admin UI in the PoC. Becomes a `featured` flag in the DB later. |
| Meaning of "top rated" on the category page | Top 3 products in the category by `rating.rate` (never empty, unlike a fixed threshold); the rest are "additional". |
| What "text matching the search term" means | Case-insensitive substring on title, description, category; term trimmed. |
| When search runs | On button click / Enter (per the AC), not live as you type. Query in the URL so results can be shared or reloaded. |
| Where category links live | Header navigation, visible on every page; URL-safe slugs. |
| "Contact details" in the enquiry form | Name + email required; phone and message optional. |
| What the sales email contains | Product title, id, price, customer details; `Reply-To` = customer email (`From` stays a system address for SPF/DMARC). |
| Email delivery failure | Customer sees an error and can retry; "Thank you" only after the email is sent. |
| Enquiry persistence | Not stored; email is the system of record for the PoC. |
| Fake Store unavailable | Backend serves the committed snapshot so the PoC stays usable. |
| Look and feel | Neutral, accessible default styling; real branding replaces `theme.css` + components. |
| Platform | Web only (desktop + basic responsive). No native mobile app. |

---

## 8. Deliberate Cuts / Simplifications (→ DECISIONS.md)

| Cut | Why it's acceptable now | When to revisit |
| :--- | :--- | :--- |
| No database | Fake Store is allowed; keeps setup zero-config. | Real catalogue / enquiry history. |
| Filtering in `CatalogService` (in memory) | 20 products; keeps the port tiny. | DB adapter: push `q`/category filters into the port. |
| No shared types package | Avoids workspace + Docker build complexity; frontend keeps its own API DTOs. | Generate client types from an OpenAPI spec. |
| No auth / admin UI | Not in the ACs. | Owner needs to manage featured products. |
| No rate limiting / CAPTCHA on enquiries | Local PoC. | Before public launch. |
| No pagination | 20 products. | Real catalogue size. |
| Minimal frontend tests | Critical path covered by backend tests in the time-box. | Add RTL + Playwright e2e. |

---

## 9. How the Design Grows Beyond the PoC (→ DECISIONS.md)

* **New data source:** implement `ProductRepository` (e.g. `PostgresProductRepository`), wire it in `server.ts`. Routes, services, frontend unchanged.
* **New email provider:** implement `EmailProvider` (e.g. `SesEmailProvider`) or point SMTP config at SES. `EnquiryService` unchanged.
* **Rebrand:** replace `theme.css` and presentational components. Hooks, API client, backend unchanged.
* **AWS deployment:** `api` container → ECS Fargate / App Runner; `web` build → S3 + CloudFront; SES for email; RDS for products/enquiries; secrets in SSM / Secrets Manager.
* **Mobile client later:** the backend is a client-agnostic JSON API, so an iOS/Android app can reuse it as is.

---

## 10. Testing Strategy (critical path, confidence to change)

| Test | Type | Covers |
| :--- | :--- | :--- |
| `CatalogService.featured` | Unit (fake repo) | Configured order, unknown IDs skipped. |
| `CatalogService.byCategory` | Unit | Top 3 / additional split, unknown slug. |
| `CatalogService.search` | Unit | Case-insensitivity, title/description/category match, no false positives. |
| `GET /api/products/:id` | Supertest | 200, 400 (bad id), 404. |
| `POST /api/enquiries` | Supertest (fake email provider) | 202 + email called with correct `to`/`replyTo`/product; 400 invalid body; 404 unknown product; 502 provider failure. |
| `FakeStoreRepository` | Unit (mocked fetch) | Maps to domain model; falls back to snapshot on failure. |
| *(Stretch)* `EnquiryForm` | RTL | Submit → "Thank you"; error keeps form values. |

All backend tests use `createApp(deps)` with fakes, so no network is needed and the tests are deterministic.

---

## 11. Time-Boxed Execution Plan (~2.5 h; actual time logged)

| Phase | Time | Tasks |
| :--- | :--- | :--- |
| **1. Setup & guardrails** | 20 min | Git repo on `main`, commit this plan + `AGENTS.md`. Branch `feat/product-catalogue`. Scaffold backend + frontend, `.env.example`. **Get it running without Docker first.** |
| **2. Backend** | 45 min | Domain types, ports, `FakeStoreRepository` (cache + snapshot fallback), `SmtpEmailProvider`, services, routes, Zod, error middleware, `createApp`. |
| **3. Backend tests** | 25 min | Tests per §10. |
| **4. Frontend** | 40 min | `theme.css`, `api/client.ts`, hooks, Header (categories + search), Home, Category, Search, Product Detail + Enquiry form, loading/empty/error/not-found states. |
| **5. Docker** | 10 min | Dockerfiles + `docker-compose.yml`; verify clean `docker compose up --build` from a fresh clone. |
| **6. Review & docs** | 20 min | Review AI code against `AGENTS.md`; write README, DECISIONS.md, AI_USAGE.md, time spent. Open PR with full description. Leave it open. |

**If running over, cut in this order:** RTL test → loading skeletons/polish → non-Docker docs. **Never cut:** ACs, backend tests, DECISIONS.md, AI_USAGE.md, PR description.

**Throughout:** keep a running log in `AI_USAGE.md` of key prompts and AI mistakes caught, and note the start/end time of each phase.

---

## 12. Submission Checklist (from the brief)

- [ ] Git repo (GitHub/GitLab/Bitbucket); reviewers given access if private.
- [ ] Work on a feature branch; **PR into `main` left open**. PR description covers: summary, AC → code mapping, key decisions, how to run/test, known gaps, time spent.
- [ ] Full source including tests.
- [ ] `README.md`: stack choice + why, setup/run (<10 min), configuration, how to run tests, Mailpit URL.
- [ ] `DECISIONS.md`: assumptions (§7), dropped/simplified requirements (§8), growth path (§9), next day (§13).
- [ ] `AI_USAGE.md`: tools and models, agent instruction files (`AGENTS.md`), this plan, 3–5 key prompts/moments, where the AI was wrong and how it was caught.
- [ ] Time spent: actual total, split across planning / building / testing / reviewing.
- [ ] Ready for the 45-min follow-up: be able to explain every file and make a small live change (e.g. new adapter, new form field, change featured products).

---

## 13. With Another Day (→ DECISIONS.md)

1. Postgres adapter for `ProductRepository` + migration; move filtering into the port.
2. Store enquiries (`EnquiryRepository`) before emailing; retry/outbox for email failures.
3. Rate limiting + honeypot/CAPTCHA on the enquiry endpoint.
4. OpenAPI spec → generated client types.
5. Playwright e2e for the five ACs; CI (lint, typecheck, test) on PRs.
6. Admin view (or CMS field) for the owner to choose featured products.
7. AWS deployment (IaC with CDK/Terraform), structured logging, health checks.

---

## Appendix: Brief, verbatim (acceptance criteria, constraints, deliverables)

### Scenario (summary)
An entrepreneur wants a product catalogue MVP (web or mobile). Customers search and browse the catalogue and submit an enquiry for products they want. Creative work on look and feel is in progress. Product metadata is not important yet, so the Fake Store API (https://fakestoreapi.com) is acceptable. They have been burned by throwaway prototypes: they want a foundation that can grow. **The product data source, look and feel, and email provider are all expected to change.**

### How we assess (verbatim points)
- **Use AI to plan and build.** Use any AI coding tools. They want to see how you direct them.
- **You own every line.** AI-generated code, docs and READMEs are fine, but you must review them and defend them in the interview.
- **Make assumptions.** The acceptance criteria deliberately leave gaps. Make a reasonable assumption, record it, and move on.
- **Time-box to 2–3 hours.** If you drop or simplify a requirement, say why. Report actual time spent honestly.
- **Focus on the critical path.** A small, well-reasoned solution beats a large, unexplained one.

### Technical constraints
1. Choose one client and one backend, in any combination. State your choice and why in the README.
   - Client options: React web app (TypeScript preferred) · iOS app in Swift or Objective-C · Android app in Kotlin or Java
   - Backend options: Node.js (TypeScript preferred) · PHP with Laravel
2. Do not call the Fake Store API directly from the client; all product data must go through your backend.
3. If you include infrastructure, it must be compatible with AWS.
4. A reviewer must be able to run your solution locally in under 10 minutes by following your README. For web, keep setup to one or two commands where possible (for example `docker compose up`).
5. Do not commit secrets. Use an example env file (for example `.env.example`) for any configuration.
6. Your solution must not depend on paid services or accounts the reviewer would need to create.

### Acceptance criteria
```gherkin
Home page
GIVEN I have chosen 5 products to be "top rated"
WHEN I am viewing the home page
THEN I see those 5 featured products

Category page
GIVEN my products are organised into categories
WHEN I click on a category link
THEN I see top rated products for that category
  AND I see additional products in that category

Search
GIVEN I am looking for a specific product
  AND I have entered a search term in the search bar
WHEN I click the search button
THEN I only see products that have text matching that search term

Product page
GIVEN I am browsing the products
  AND I want to see more details about a specific product
WHEN I click on a product tile
THEN I see the product details page

Enquiry
GIVEN I am viewing a product
  AND I am interested in a product
  AND I click on the Enquire button
  AND I complete the subsequent form with my contact details
WHEN I submit the form
THEN the sales inbox will receive an email
  AND the customer will see a "Thank you" message
```

### What to submit
1. **Repository:** public or private Git repo on GitHub, GitLab or Bitbucket (give reviewers access if private).
2. **Pull request:** build on a feature branch and raise a PR into `main` in your own repo. Leave it open. The PR description is part of the assessment.
3. **Source code:** the full source, including tests.
4. **README:** setup and run instructions, plus anything the reviewer needs to configure.
5. **Decisions and assumptions:** a `DECISIONS.md` (or README section) covering: assumptions where the acceptance criteria were unclear; requirements dropped or simplified, and why; how the design supports growth beyond the PoC; what you would do next with another day.
6. **AI usage notes:** an `AI_USAGE.md` covering: tools and models used; any agent instruction files (e.g. `CLAUDE.md`, `AGENTS.md`, `.cursor/rules`), committed to the repo; your plan or spec, if you used one; 3–5 key prompts or moments that shaped the solution; where the AI got something wrong and how you caught it.
7. **Time spent:** actual time, roughly split across planning, building, testing and reviewing.

Submission deadline: within 3 days of receiving the challenge email, by replying with the repository link.
