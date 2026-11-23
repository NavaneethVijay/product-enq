# Decisions & Assumptions

> Written from `docs/PLAN.md` before the build. Update it during the build when anything changes, and do a final review before opening the PR. Covers the four items the brief asks for: assumptions, dropped/simplified requirements, growth beyond the PoC, and next steps.

## Stack choice

- **Frontend: React + TypeScript + Vite.** The PoC is a few read-heavy pages and one form, and the look and feel is still being designed, so a plain component tree with a CSS-variable theme is the easiest to restyle or replace. Vite keeps startup and configuration minimal. *Not Next.js:* its server rendering and routing overlap with the separate backend the brief requires, and SEO isn't needed yet. *Not native mobile:* slower for reviewers to build and run; the JSON API keeps a mobile client possible later.
- **Backend: Node.js + Express + TypeScript.** Small, widely known, no hidden conventions, and one language across the stack. Boundaries are plain TypeScript interfaces, so the architecture is visible in the code. *Not NestJS:* its boilerplate would take a large share of a 2–3 hour time-box; `createApp(deps)` plus ports gives the same swappability. *Not Laravel:* two languages. *Not Fastify:* little benefit at this size.
- **Principle:** the brief rewards "a small, well-reasoned solution", so time goes into the three seams that will change (data source, email provider, look and feel), not the framework.

## Assumptions (where the acceptance criteria are unclear)

| Gap | Assumption |
| :--- | :--- |
| How the owner "chooses" the 5 featured products | Config: `FEATURED_PRODUCT_IDS`, with a default in `.env.example`. No admin UI. Unknown IDs are skipped with a log warning. |
| "Top rated" on the category page | Top 3 products in the category by `rating.rate`; the rest are "additional". Never empty, unlike a fixed threshold. |
| What "text matching the search term" means | Case-insensitive substring match on title, description and category; term trimmed; empty term → 400. |
| When search runs | On button click / Enter (per the AC), not live as you type. Query kept in the URL (`/search?q=`). |
| Where category links live | Header navigation on every page, using URL-safe slugs (e.g. `mens-clothing`). |
| "Contact details" in the enquiry form | Name and email required; phone and message optional. |
| What the sales email contains | Product title, id, price and customer details. `Reply-To` = customer; `From` = system address (SPF/DMARC-safe). |
| Email delivery failure | Customer sees an error and can retry; "Thank you" only after the email is sent (API returns 502 on failure). |
| Enquiry persistence | Not stored; email is the record for the PoC. |
| Fake Store unavailable | Backend falls back to a committed snapshot (`backend/data/products.json`). |
| Look and feel | Neutral, accessible default styling; real branding replaces `theme.css` and the components. |
| Platform | Web only (desktop + basic responsive). |

## Dropped or simplified requirements

| Cut | Why | Revisit when |
| :--- | :--- | :--- |
| No database | Fake Store is allowed; zero-config local setup. | Real catalogue or enquiry history is needed. |
| In-memory filtering in `CatalogService` | 20 products; keeps the port small. | Moving to a DB: push filters into the port. |
| No shared types package | Avoids workspace + Docker build complexity. | Generate client types from an OpenAPI spec. |
| No auth / admin UI | Not in the acceptance criteria. | Owner needs to manage featured products. |
| No rate limiting / CAPTCHA | Local PoC only. | Before public launch. |
| No pagination | 20 products. | Real catalogue size. |
| Minimal frontend tests | Time-box; critical path covered by backend tests. | Add RTL + Playwright e2e. |

## How the design grows beyond the PoC

- **Data source:** implement `ProductRepository` (e.g. Postgres/RDS or an ERP adapter) and wire it in `server.ts`. Routes, services and frontend are unchanged.
- **Email provider:** implement `EmailProvider` (e.g. SES) or point SMTP config at SES. `EnquiryService` is unchanged.
- **Look and feel:** replace `theme.css` and the props-only components. Hooks, API client and backend are unchanged.
- **AWS:** API container on ECS Fargate / App Runner, frontend build on S3 + CloudFront, SES for email, RDS for data, secrets in SSM / Secrets Manager.
- **Mobile:** the backend is a client-agnostic JSON API, so a native app can reuse it.

## With another day

1. Postgres adapter for `ProductRepository` with migrations; move filtering into the port.
2. Store enquiries (`EnquiryRepository`) before emailing; retry/outbox for email failures.
3. Rate limiting and honeypot/CAPTCHA on enquiries.
4. OpenAPI spec and generated client types.
5. Playwright e2e for the five acceptance criteria; CI (lint, typecheck, test) on PRs.
6. Admin view or CMS field for choosing featured products.
7. AWS deployment with IaC (CDK/Terraform), structured logging, health checks.

## Changes made during the build

_Record any decision that differs from `docs/PLAN.md` here, with the reason._

| Date | Change | Reason |
| :--- | :--- | :--- |
| | | |
