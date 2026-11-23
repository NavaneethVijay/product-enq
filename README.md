# Product Catalogue PoC

A product catalogue where customers browse categories, search, view product details and send an enquiry that emails the sales inbox. Product data comes from the [Fake Store API](https://fakestoreapi.com) through our own backend.

It's built as a **foundation, not a throwaway**. The three things the brief says will change (the product data source, the email provider and the look and feel) each sit behind one clear seam.

---

## Run it (Docker, one command)

**Prerequisite:** Docker Desktop (or Docker Engine with Compose v2).

```bash
docker compose up --build
```

| What | URL |
| :--- | :--- |
| **App** | http://localhost:8080 |
| **Sales inbox** (Mailpit: catches every email, nothing is really sent) | http://localhost:8025 |
| API (through nginx) | http://localhost:8080/api |

No `.env` file is needed: Compose uses the defaults in `.env.example`. To change a setting, `cp .env.example .env` and edit it.

**Try the enquiry flow:** open a product, click **Enquire**, fill in your name and email, send. You'll see "Thank you", and the email appears in the Mailpit inbox.

Stop with `Ctrl+C`, or `docker compose down`.

---

## Run it without Docker (local development)

**Prerequisites:** Node.js 22.9+ and npm.

```bash
cp .env.example .env

# Terminal 1: API on :3000
cd backend && npm install && npm run dev

# Terminal 2: web on :5173 (proxies /api to the API)
cd frontend && npm install && npm run dev

# Optional, to receive enquiry emails: Mailpit on :1025 (SMTP) / :8025 (inbox)
docker compose up mailpit
```

Open http://localhost:5173. Without Mailpit, browsing works and enquiries show a clear "email could not be sent" error.

---

## Tests

```bash
cd backend && npm test        # 64 tests: services, adapters, in-memory query, config, every API endpoint
cd frontend && npm test       # 5 tests: product page → enquiry → "Thank you", error handling
npm run typecheck             # in either folder
```

All tests run offline: the backend uses fakes injected through `createApp(deps)`, and the frontend mocks `fetch`.

---

## Tech stack and why

| Layer | Choice | Why |
| :--- | :--- | :--- |
| Client | **React + TypeScript (Vite)** | A few read-heavy pages and one form. The look and feel is still being designed, so a plain component tree with a CSS-variable theme is the easiest to restyle. Vite keeps startup and config minimal. |
| Backend | **Node.js + Express + TypeScript** | Small, widely known, no hidden conventions; one language across the stack. Boundaries are plain TypeScript interfaces, so the architecture is visible in the code. |
| Validation | Zod | One library for env, request input and upstream responses. |
| Email | Nodemailer → Mailpit locally | Real SMTP flow with no account needed; SES in production via SMTP host and credentials settings. |
| Tests | Vitest, Supertest, React Testing Library | Fast, TypeScript-native, test behaviour the way it's used. |
| Local infra | Docker Compose (`api`, `web` on nginx, `mailpit`) | One command; images map directly to AWS (ECS/App Runner, S3 + CloudFront, SES). |

**Why the simpler options:** Next.js would overlap with the separate backend the brief requires and adds server rendering the PoC doesn't need. NestJS would spend much of a 2–3 hour time-box on boilerplate, and ports plus `createApp(deps)` give the same swappability. Full reasoning is in [DECISIONS.md](DECISIONS.md#stack-choice).

---

## Architecture

```text
Browser ──/api (same origin)──▶ Express API ──▶ ProductRepository ──▶ FakeStoreRepository ──▶ fakestoreapi.com
  React SPA                      routes (Zod)                          (cache, timeout, snapshot fallback,
  (Vite dev / nginx in Docker)   services (rules)                       in-memory filters/sort/paging)
                                 errorHandler      ──▶ EmailProvider ──▶ SmtpEmailProvider ──▶ Mailpit / SES
```

- **The browser never calls Fake Store.** All product data goes through our API, served on the same origin as the app, so no CORS is configured.
- **Ports and adapters:** services depend on `ProductRepository` and `EmailProvider` interfaces. Swapping Fake Store for a database, or SMTP for SES, means a new adapter plus one line in `backend/src/server.ts`.
- **Query-ready data port:** `find(query)` supports filters, sorting and pagination, so the API already accepts them and a database adapter can run them as one SQL query. The UI controls are deferred.
- **Rebrandable UI:** design tokens live in `frontend/src/theme.css`; components only receive props.

The architecture decisions and their trade-offs are in [DECISIONS.md](DECISIONS.md#architecture-decisions).

### Project structure

```text
backend/src/   server.ts (wiring) · app.ts · config.ts · domain/ · ports/ · adapters/ · services/ · routes/ · middleware/ · __tests__/
frontend/src/  api/client.ts · hooks/ · components/ (props-only) · pages/ · theme.css · styles.css
docs/PLAN.md   Plan and spec (acceptance criteria mapping, API contract, test plan)
```

---

## API

| Method | Endpoint | Returns |
| :--- | :--- | :--- |
| `GET` | `/api/products/featured` | The 5 featured products (`FEATURED_PRODUCT_IDS`), in that order |
| `GET` | `/api/products?q=term` | Search on title, description, category → `{ items, page, pageSize, totalItems, totalPages }` |
| `GET` | `/api/products/:id` | One product, or `404` |
| `GET` | `/api/categories` | `[{ slug, name }]` |
| `GET` | `/api/categories/:slug` | `{ category, topRated, additional: { items, page, … } }`, or `404` |
| `POST` | `/api/enquiries` | `{ productId, name, email, phone?, message? }` → `202`; `400` invalid; `404` unknown product; `429` rate limited; `502` email failed |

Listing endpoints also accept `page`, `pageSize` (max 100), `sort` (`rating`, `price-asc`, `price-desc`), `minPrice`, `maxPrice` and `minRating`. Errors always look like `{ "error": { "code", "message" } }`.

---

## Configuration

All settings are environment variables with defaults in [`.env.example`](.env.example). The API validates them at startup and refuses to start with a message naming any invalid value.

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `FEATURED_PRODUCT_IDS` | `1,5,9,13,17` | The products the owner has chosen for the home page |
| `TOP_RATED_COUNT` | `3` | Max "top rated" products on a category page |
| `TOP_RATED_MIN_RATING` | `3` | Minimum rating (0–5) to count as top rated |
| `SALES_INBOX_EMAIL` | `sales@example.com` | Where enquiries are sent |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_FROM` | `localhost` / `1025` / `catalogue@example.com` | Mail server (Docker sets `SMTP_HOST=mailpit`) |
| `SMTP_USER` / `SMTP_PASS` | empty | Credentials for relays that need them, e.g. SES SMTP. Set both or neither; when set, TLS is required |
| `CACHE_TTL_SECONDS` | `300` | How long product data is cached |
| `FAKESTORE_BASE_URL` | `https://fakestoreapi.com` | Product source |
| `PORT` | `3000` | API port |
| `TRUST_PROXY` | `0` | Reverse proxies in front of the API, for real client IPs (Docker sets `1`) |
| `API_PROXY_TARGET` | `http://localhost:3000` | Where the Vite dev server proxies `/api` (local runs only) |

No secrets are needed to run locally, and none are committed. In production, `SMTP_PASS` comes from a secrets manager, not a file.

---

## Reliability and security at a glance

- **Errors:** typed errors, one JSON error shape, no stack traces sent to clients.
- **Validation:** Zod on every input and on Fake Store responses; 10 kB body limit.
- **Product source:** in-memory cache, 5 s timeout, and if Fake Store is down, stale cache then a committed snapshot, so the app keeps working.
- **Enquiry abuse:** 5 per client per 15 minutes, a honeypot field, header-injection checks, HTML-escaped emails, and 10 s SMTP timeouts.

Details, including what's deliberately left to production infrastructure, are in [DECISIONS.md](DECISIONS.md#backend-reliability-and-security-basics-current-state).

---

## Documentation

| File | What's in it |
| :--- | :--- |
| [DECISIONS.md](DECISIONS.md) | Architecture decisions, assumptions where the criteria were unclear, what was cut and why, how it grows, what's next |
| [AI_USAGE.md](AI_USAGE.md) | Tools and models, agent instructions, key prompts, where the AI was wrong, **time spent** |
| [docs/PLAN.md](docs/PLAN.md) | Plan and spec: acceptance criteria mapping, API contract, test strategy |
| [AGENTS.md](AGENTS.md) | Rules for AI coding agents working in this repo |
