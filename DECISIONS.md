# Decisions & Assumptions

> Architecture decisions, assumptions where the acceptance criteria are unclear, dropped or simplified requirements, how the design grows beyond the PoC, and next steps. Scope and the API contract are in `docs/PLAN.md`.

## Architecture decisions

These were set in the plan (`docs/PLAN.md`) before feature development, from the brief's constraints and the three things it says will change (product data source, look and feel, email provider). Everything later builds on them.

| # | Decision | Why | Trade-off accepted |
| :--- | :--- | :--- | :--- |
| 1 | **Backend for frontend.** The browser only talks to our API; the API is the only thing that talks to the product source. | Constraint 2. It also keeps product data, business rules and secrets server-side, and gives one place to change sources. | One extra hop for reads, offset by caching. |
| 2 | **Same-origin API, no CORS.** The frontend calls relative `/api` paths: the Vite proxy in local dev, nginx in Docker, CloudFront path routing (`/api/*` → API) in production. | Browsers block cross-origin calls by default; CORS headers would only *widen* who can call the API from a browser. Same origin means nothing to configure and nothing to get wrong. | If the frontend is ever hosted on another domain, add a strict origin allowlist. |
| 3 | **Ports and adapters** for the two external dependencies: `ProductRepository` and `EmailProvider`, with one composition root (`server.ts`) and `createApp(deps)`. | The brief says both will change. Swapping one is a new adapter plus one line of wiring; tests inject fakes through the same function. | A little indirection, limited to the two seams that need it. |
| 4 | **Thin routes, rules in services, typed errors, one error shape** (`{ error: { code, message } }`). | Business rules (featured, top rated, search, enquiry) are testable without HTTP, and clients handle errors one way. No stack traces leak. | None significant. |
| 5 | **Validate at every edge with Zod:** env, params, query strings, bodies, *and* upstream responses. | Bad input fails early with a clear 400; a changed upstream fails loudly in the adapter, not in the UI. | Schemas to maintain alongside types (types are inferred where possible). |
| 6 | **Resilient product source:** in-memory TTL cache, request de-duplication, 5 s timeout, then stale cache, then a committed snapshot. | A reviewer's demo must not depend on a free third-party API being up (constraint 6), and pages stay fast. | Data can be up to `CACHE_TTL_SECONDS` old; per-instance cache. |
| 7 | **Config from env, validated at startup;** `.env.example` documents every variable; no secrets in the repo. | Constraint 5; the same images run locally and on AWS with different config. | Changes need a restart (fine for deployment config). |
| 8 | **Look-and-feel seam:** design tokens in `theme.css`; components are props-only, data fetching lives in pages/hooks. | Creative work is in progress; a rebrand replaces tokens and components without touching data or backend. | Plain CSS instead of a UI kit (fewer dependencies, less to override later). |
| 9 | **Security baseline from the start:** request body limit, input validation, HTML-escaped emails, header-injection checks, framework header (`X-Powered-By`) disabled. Full security headers and WAF belong at the edge (CloudFront/WAF) in production. | Basics in code; infrastructure concerns at the infrastructure layer. | `helmet` not added for the PoC. |
| 10 | **Containers, AWS-shaped:** API and web as plain Docker images (multi-stage builds; the API runs as a non-root user with production dependencies only; the web image is static files on nginx); SMTP config works with SES. | Constraint 3; maps to ECS/App Runner + S3/CloudFront + SES + RDS without code changes. | None for the PoC. |

Refinements made during the build (top-rated rule, query-capable port, enquiry abuse protection) are recorded under *Changes made during the build*.

## Stack choice

- **Frontend: React + TypeScript + Vite.** The PoC is a few read-heavy pages and one form, and the look and feel is still being designed, so a plain component tree with a CSS-variable theme is the easiest to restyle or replace. Vite keeps startup and configuration minimal. *Not Next.js:* its server rendering and routing overlap with the separate backend the brief requires, and SEO isn't needed yet. *Not native mobile:* slower for reviewers to build and run; the JSON API keeps a mobile client possible later.
- **Backend: Node.js + Express + TypeScript.** Small, widely known, no hidden conventions, and one language across the stack. Boundaries are plain TypeScript interfaces, so the architecture is visible in the code. *Not NestJS:* its boilerplate would take a large share of a 2–3 hour time-box; `createApp(deps)` plus ports gives the same swappability. *Not Laravel:* two languages. *Not Fastify:* little benefit at this size.
- **Principle:** the brief rewards "a small, well-reasoned solution", so time goes into the three seams that will change (data source, email provider, look and feel), not the framework.

### Dependencies

| Package | Why |
| :--- | :--- |
| `express` (v5) | HTTP server; v5 forwards rejected async handlers to the error middleware, so no wrapper utility is needed. |
| `zod` | Validates env, request input and Fake Store responses with one library. |
| `express-rate-limit` | Per-client limit on the enquiry endpoint (spam / email abuse). Small, widely used, no external store needed for one instance. |
| `nodemailer` | SMTP client: Mailpit locally; SES SMTP in production by setting the host and `SMTP_USER`/`SMTP_PASS` (TLS is then required). |
| `react-router-dom` | Client-side routes (`/category/:slug`, `/search?q=`, `/products/:id`) so pages can be linked and reloaded. |
| `vitest`, `supertest`, `tsx` (dev) | Tests and TypeScript dev server; no build step needed while developing. |
| `@testing-library/react`, `user-event`, `jest-dom`, `jsdom` (dev, frontend) | Tests the enquiry flow the way a user interacts with it. |

## Assumptions (where the acceptance criteria are unclear)

Each assumption fills a real gap in the acceptance criteria. *Depends on it* lists what would change if the assumption changed; *How to confirm or change* is the question for the business owner and the cost of a different answer.

| # | Gap | Assumption | Why | Depends on it | How to confirm or change |
| :--- | :--- | :--- | :--- | :--- | :--- |
| A1 | How the owner "chooses" the 5 featured products | Config: `FEATURED_PRODUCT_IDS` (default in `.env.example`). Unknown ids are skipped with a warning. | No admin or data store is in scope; config is the smallest thing the owner can change without code. | `config.ts`, `CatalogService.getFeatured`; `CatalogService.test.ts`, `api.test.ts` | Ask how often the selection changes. Frequent changes → a `featured` flag in the data source or an admin field; only the repository and service change, not the API. |
| A2 | What "top rated" means on a category page | Rated ≥ `TOP_RATED_MIN_RATING` (default 3.0), highest first, at most `TOP_RATED_COUNT` (default 3); the rest under "More in this category". | Rank alone labels weak products "top rated" in small categories; a threshold alone can flood the section. Detail below. | `CatalogService.getCategoryProducts`, category page; `CatalogService.test.ts` | Confirm both numbers with the owner; they are config, so no code change. A different rule (e.g. editorial picks) changes only the service. |
| A3 | What "text matching the search term" means | Case-insensitive substring match on title, description and category; term trimmed; empty term → 400. | Matches what a shopper expects from a small catalogue without a search engine. | `inMemoryQuery.ts`, `CatalogService.search`; `CatalogService.test.ts`, `api.test.ts` | Check with real search terms from the owner. Ranking or fuzzy matching belongs in a search-capable data source behind the same `find(query)`. |
| A4 | Which "contact details" the enquiry form collects | Name and email required; phone and message optional. | Email is enough for sales to reply; every extra required field loses enquiries. | `domain/enquiry.ts` schema, `EnquiryForm`; `api.test.ts`, `ProductDetailPage.test.tsx` | Confirm with the sales team. A new field = schema + form + email template, all covered by existing tests. |
| A5 | What the sales email contains and who it comes from | Product title, id and price plus customer details. `Reply-To` = customer; `From` = system address. | Sales can reply directly; sending *from* the customer's address would fail SPF/DMARC. | `EnquiryService` (`buildEnquiryEmail`); `EnquiryService.test.ts` | Confirm the format with the sales team; it lives in one function. |
| A6 | What happens if the email can't be sent | Customer sees an error and can retry; "Thank you" only after the email is accepted (API returns 502 on failure). | Showing "Thank you" for a lost enquiry is worse than asking for a retry. | `EnquiryService`, `useEnquiry`; `api.test.ts`, `ProductDetailPage.test.tsx` | If no enquiry may ever be lost: store it first and send via an outbox (next steps). |
| A7 | Whether enquiries are stored | Not stored; the email is the record for the PoC. | No database is in scope and the brief only asks for an email. | Nothing yet; an `EnquiryRepository` port would be added | Ask whether sales needs history or reporting. |
| A8 | Currency | Prices shown as USD (`$12.50`). | Fake Store gives no currency; USD is its implied default. | `frontend/src/format.ts`, email template | Confirm with the owner; the real data source should carry the currency. |

### Interpretations and design choices (not open questions)

These follow from the brief or are engineering choices, so they are recorded here rather than as assumptions.

| Item | Choice | Basis |
| :--- | :--- | :--- |
| When search runs | On button click / Enter, not as you type; query kept in the URL (`/search?q=`). | The AC says "when I click the search button". The URL makes results shareable and reloadable. |
| Where category links live | Header navigation on every page, with URL-safe slugs (e.g. `mens-clothing`). | The AC needs a category link to click; the header makes it reachable from any page. |
| Enquiry form placement | Inline on the product page (no modal), replaced by "Thank you" on success. | Simpler and accessible; no focus-trap code. |
| Platform | Web only (desktop + basic responsive). | The brief allows web or mobile; web is the fastest for reviewers to run. The JSON API keeps a mobile client possible. |
| Look and feel | Neutral, accessible default styling. | Branding is in progress; real branding replaces `theme.css` and the components. |
| Fake Store unavailable | Stale cache, then a committed snapshot (`backend/data/products.json`). | A reviewer's demo must not depend on a free third-party API (architecture decision 6). |
| Product images | URLs come from our API but point at Fake Store's image host. | Product *data* always goes through the backend (constraint 2). In production, images would be served from our own CDN (S3 + CloudFront). |
| Enquiry input limits | Max 5 enquiries per client per 15 minutes. Name ≤ 100, phone ≤ 30 (digits, spaces, `+()-.`), message ≤ 2000, email ≤ 254 characters. Line breaks rejected in single-line fields. Body ≤ 10 kB. | Each enquiry sends a real email; limits stop the form being used to spam the inbox or inject headers. |
| Product id format | Any `[A-Za-z0-9_-]{1,64}` string; anything else → 400. | Fits future SKUs, not just Fake Store's numbers. |

### Decision: the "top rated" rule on category pages

The acceptance criteria say a category page shows "top rated products" and "additional products" but don't define top rated.

**Rule:** a product is top rated if `rating.rate >= TOP_RATED_MIN_RATING`. At most `TOP_RATED_COUNT` are shown, highest rated first (ties: more reviews first). Everything else in the category goes under "More in this category", so every product in the category is always shown.

**Options considered**

| Option | Problem |
| :--- | :--- |
| Top N by rank only | In a small category a weak product still becomes "top rated" (e.g. jewelery #7, rated 3.0). |
| Minimum rating only | A category with many well-rated products would show them all as "top rated", making the split meaningless. |
| **Minimum rating + maximum count (chosen)** | "Top rated" means both good and the best few. A section may be empty if nothing qualifies; the UI shows a clear message. |

**Defaults:** `TOP_RATED_COUNT=3`, `TOP_RATED_MIN_RATING=3` (inclusive, out of 5).

Effect on the Fake Store data:

| Category | Min 3.0 (default): top rated | Min 4.0: top rated |
| :--- | :--- | :--- |
| men's clothing | #3 (4.7), #2 (4.1), #1 (3.9) | #3, #2 |
| jewelery | #5 (4.6), #6 (3.9), #7 (3.0) | #5 |
| electronics | #12 (4.8), #11 (4.8), #9 (3.3) | #12, #11 |
| women's clothing | #18 (4.7), #19 (4.5), #17 (3.8) | #18, #19 |

- With 3.0, today's data gives the same result as "top 3 by rank", because every category's top 3 is already rated 3.0 or higher. The minimum still guards against weak products as the catalogue changes.
- 4.0 is stricter and closer to what customers usually read as "top rated". Every category still keeps at least one product. It is a one-line `.env` change if the owner prefers it.

**Why config, not code:** it is a business rule the owner may want to tune. It lives in backend config (validated at startup) and is applied only in `CatalogService`, so every client gets the same result. In production it would move to an admin setting or the database without touching routes or the frontend.

### Decision: filtering, sorting and pagination: backend ready, UI deferred

A category page normally has filters, sorting and pagination. With Fake Store's 20 products (4–6 per category) the controls would add nothing for users, so the **UI is deferred**. The **backend supports them now**, so adding them later, or swapping Fake Store for a database, doesn't mean redesigning the backend.

- **Port:** `ProductRepository.find(query)` takes a `ProductQuery` (category, search text, `minPrice`, `maxPrice`, `minRating`, excluded ids, `sort`, `page`, `pageSize`) and returns `Page<Product>` (`items`, `page`, `pageSize`, `totalItems`, `totalPages`). Services never load the whole catalogue.
- **Fake Store adapter:** Fake Store has no filtering or paging, so `FakeStoreRepository` fetches and caches the full list and applies the query in memory (`inMemoryQuery.ts`). A database adapter implements the same `find` as one SQL query (`WHERE … ORDER BY … LIMIT/OFFSET` plus a count). Nothing above the port changes.
- **API:** `GET /api/categories/:slug` and `GET /api/products?q=` accept `page`, `pageSize` (max 100), `sort` (`rating`, `price-asc`, `price-desc`), `minPrice`, `maxPrice` and `minRating`, all validated with Zod (invalid → 400). The paged response shape is already in place, so the API contract won't change when the UI arrives.
- **Category rules:** filters (price, rating) narrow the whole category, top rated included. Sort and pagination apply only to "More in this category". Top rated stays a fixed highlight sorted by rating, so the UI can show it on page 1 only.
- **Not added:** filtering by attributes Fake Store doesn't have (brand, size, stock). Adding one means a new optional field on `ProductQuery`, a line in the in-memory filter, and the SQL condition in a database adapter.

### Backend reliability and security basics (current state)

| Concern | Status | What exists / why |
| :--- | :--- | :--- |
| **Error handling** | ✅ Implemented | Typed errors (`ValidationError` 400, `NotFoundError` 404, `UpstreamError` 502) thrown by services and adapters. One `errorHandler` middleware maps them, plus Zod errors (400), malformed JSON (400) and oversized bodies (413), to `{ error: { code, message } }`. Unknown errors → 500 with a generic message; stack traces are logged, never sent. Unknown routes → JSON 404. Express 5 forwards rejected async handlers automatically. Config is validated at startup and the server refuses to start with a readable message if it's invalid. |
| **Input validation** | ✅ Implemented | Zod on every route param, query string, request body and env var, and on Fake Store responses. Body limit 10 kB. CR/LF rejected in single-line enquiry fields (email header injection); HTML-escaped email body. |
| **Caching** | ✅ Implemented | `FakeStoreRepository` caches the product list in memory for `CACHE_TTL_SECONDS` (default 300). Concurrent requests share one in-flight upstream call. Per-process only; no HTTP cache headers. |
| **Timeouts** | ✅ Implemented (outbound) | Fake Store calls abort after 5 s (`AbortSignal.timeout`). SMTP: 10 s to connect, 10 s for the server greeting, 15 s of socket inactivity (Nodemailer's defaults are 2 min+), so a hung mail server shows the customer "try again" quickly. Inbound requests use Node's defaults; in production the load balancer/CloudFront timeouts apply in front. |
| **Retry strategy** | ⚠️ Partial (fallback, not retry) | No immediate retries. A failed Fake Store call falls back to stale cache, then to the committed snapshot, and Fake Store isn't called again for 30 s (a simple circuit-breaker style back-off), so users still get products. Failed emails are not retried: the customer sees an error and can resend. |
| **Logging** | ⚠️ Minimal | `console` warnings/errors for upstream failures, SMTP failures, unknown featured ids and unhandled errors. No request/access logs, request ids or structured (JSON) logs. |
| **CORS** | ➖ Not needed by design | See architecture decision 2: same-origin API, so no CORS headers are sent and other sites can't call the API from a browser. CORS isn't access control (non-browser clients ignore it); validation, rate limiting and edge rules (WAF) are what protect the API. |
| **Rate limiting** | ✅ Implemented (enquiries only) | `POST /api/enquiries` allows **5 requests per client IP per 15 minutes** (`express-rate-limit`), because each one sends a real email. Over the limit → `429 RATE_LIMITED` in the usual error shape, with `RateLimit` and `Retry-After` headers. Browsing endpoints are not limited (cached, read-only, cheap). Counters are in memory (per instance, reset on restart). Behind a proxy the real client IP comes from `X-Forwarded-For`, controlled by `TRUST_PROXY` (number of trusted proxies: 0 locally, 1 in Docker for nginx; set to match CloudFront/ALB in production), so each visitor gets their own limit instead of sharing the proxy's IP. Trusting `X-Forwarded-For` is only safe when clients can't reach the API directly, so Docker Compose does not publish the API port: it is reachable only through nginx. **Production note:** with several API instances, use a shared store (Redis) or AWS WAF rate rules. |
| **Spam protection** | ✅ Implemented (lightweight) | Honeypot field (`website`): hidden from people, off-screen and skipped by keyboard and screen readers, but bots that fill every field fill it in. The API still answers 202 so the bot learns nothing, but sends no email and logs a warning. Together with the rate limit, length limits, email validation and header-injection checks, this covers casual abuse. **No CAPTCHA:** the brief forbids services that need accounts (constraint 6); add one (e.g. AWS WAF CAPTCHA or Cloudflare Turnstile) before public launch if spam gets past these. |
| **Security headers** | ➖ At the edge in production | `X-Powered-By` is disabled so the framework isn't advertised. The rest (HSTS, CSP, frame options…) are set by CloudFront response-header policies in production (architecture decision 9); `helmet` is the in-app alternative if the API is ever exposed directly. |

## Dropped or simplified requirements

| Cut | Why | Revisit when |
| :--- | :--- | :--- |
| No database | Fake Store is allowed; zero-config local setup. | Real catalogue or enquiry history is needed. |
| Filter / sort / pagination **UI** on category and search pages | The backend supports them (see the decision above); the controls would add nothing with 4–6 products per category. | Real catalogue size: add the controls, no backend change. |
| No shared types package | Avoids workspace + Docker build complexity. | Generate client types from an OpenAPI spec. |
| No auth / admin UI | Not in the acceptance criteria. | Owner needs to manage featured products. |
| No CAPTCHA on enquiries | Needs a third-party account (constraint 6). Rate limit + honeypot cover casual abuse. | If spam gets through after launch. |
| Minimal frontend tests | Time-box. One RTL test file covers the enquiry critical path (details → enquire → "Thank you", error keeps values, not found); other pages rely on backend tests and manual checks. | Add page tests + Playwright e2e. |

## How the design grows beyond the PoC

- **Data source:** implement `ProductRepository` (e.g. Postgres/RDS or an ERP adapter) and wire it in `server.ts`. Routes, services and frontend are unchanged.
- **Email provider:** point the SMTP settings at SES (host, port 587, `SMTP_USER`/`SMTP_PASS`), or implement `EmailProvider` on the SES API. `EnquiryService` is unchanged.
- **Look and feel:** replace `theme.css` and the props-only components. Hooks, API client and backend are unchanged.
- **AWS:** API container on ECS Fargate / App Runner, frontend build on S3 + CloudFront, SES for email, RDS for data, secrets in SSM / Secrets Manager.
- **Mobile:** the backend is a client-agnostic JSON API, so a native app can reuse it.

## With another day

1. Postgres adapter for `ProductRepository` with migrations, translating `ProductQuery` to SQL.
2. Filter, sort and pagination controls on category and search pages (the API already supports them).
3. Store enquiries (`EnquiryRepository`) before emailing; retry/outbox for email failures.
4. Production hardening of the enquiry endpoint: a shared rate-limit store (Redis) or AWS WAF rate rules across instances, and CAPTCHA if needed.
5. OpenAPI spec and generated client types.
6. Playwright e2e for the five acceptance criteria; CI (lint, typecheck, test) on PRs.
7. Admin view or CMS field for choosing featured products.
8. AWS deployment with IaC (CDK/Terraform), structured logging, health checks.

## Changes made during the build

Decisions that changed from `docs/PLAN.md` during the build, and why.

| Date | Change | Reason |
| :--- | :--- | :--- |
| 2026-11-23 | "Top rated" changed from "top 3 by rating" to "rated ≥ `TOP_RATED_MIN_RATING`, at most `TOP_RATED_COUNT`" (both configurable, defaults 3 / 3.0). | Rank alone could label a weak product "top rated" in a small category. See the top-rated decision above. |
| 2026-11-23 | Product port changed from `getAll()` to `find(query)` + `getByIds(ids)`. Category and search endpoints accept filter/sort/pagination options and return paged lists. | Category pages normally need filters, sorting and pagination. The backend now supports them so the future UI or database swap needs no backend redesign. UI controls deferred (see the decision above). |
| 2026-11-23 | Enquiry abuse protection: per-IP rate limit (5 / 15 min), honeypot field, SMTP timeouts (10 s connect). | Every enquiry sends a real email, so the form must not be usable to spam the sales inbox, and a hung mail server shouldn't leave the customer waiting minutes. Kept to what this app needs: no CAPTCHA (needs an account), no Redis (single instance). |
| 2026-11-23 | Visual refresh: neutral near-monochrome palette (no default blue), pill-shaped navigation and search, softer cards with hover lift, amber rating stars, Inter font (falls back to the system font offline). | Cleaner, more modern placeholder look. Done almost entirely in `theme.css` and `styles.css`, with only small class/markup tweaks in components, which shows the look-and-feel seam works. |
