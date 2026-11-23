# AI Usage

> How AI was directed through planning, building, testing and review: tools, instruction files, the plan, key prompts, and where the AI was wrong and how it was caught.

## Tools and models

| Tool | Model | Used for |
| :--- | :--- | :--- |
| Claude Code (CLI) | Claude Opus 5.5 (`claude-opus-5-5`) | Plan review against the brief, plan/spec and docs, implementation and tests, browser checks, and an independent audit in a fresh session before the PR. |

## Agent instruction files (committed)

- `AGENTS.md`: the single set of rules for any AI agent: scope guardrails, fixed stack, architecture rules, coding/testing conventions, workflow, status.
- `CLAUDE.md`: a short pointer so Claude Code loads `AGENTS.md` automatically.

## Plan / spec

- `docs/PLAN.md`: combined plan and spec, written before coding. It maps every acceptance criterion, constraint and deliverable from the brief to a decision, and quotes the brief verbatim in its Appendix so new AI sessions don't have to guess the scope.
- Process: before writing any code, I designed the plan with the AI, checked its suggestions against the brief, pushed back where it overreached, and agreed the final version in `docs/PLAN.md`.

## Key prompts and moments

1. **Plan review before any code, grounded in the brief.** I asked the AI to review the proposed architecture, then pointed it at the challenge PDF when it started guessing requirements. It flagged real gaps: no fallback if fakestoreapi.com is down (the demo would break for reviewers), unclear category slugs (`"men's clothing"`), the `/featured` vs `/:id` route-order bug, the risk of a `shared/` types folder in Docker builds, missing env vars, and no seam for the look-and-feel change the brief predicts (which became the CSS-variable theme and props-only components).
2. **Pushing back on over-engineering.** Prompt: *"this is like a mvp and we do not want to over complicate it but build it right enough to show case this can be reused and scaled for production."* The design was kept to five pieces: two ports, `createApp(deps)`, Zod at the edge, and a theme file. Each one maps to a change the brief predicts.
3. **Locking scope for future sessions.** Prompt: asked for the plan to capture everything so *"any new conversation started should be able to easily pick up the scope and not hallucinate it."* Result: `docs/PLAN.md` with the verbatim brief appendix, an explicit out-of-scope list, and `AGENTS.md` rules saying "not in the plan = out of scope, ask first".
4. **Making the backend ready for what a category page normally needs.** Prompt: *"make sure the backend is capable of this when replaced we do not want to reinvent or change the backend just for these things in the category page"*, followed by *"the fakestore api will not have but our adapter should have these features in the api"*. Result: the product port moved from `getAll()` to `find(query)` with filters, sorting and pagination; the Fake Store adapter implements it in memory; the API accepts and validates the options and returns paged results. The UI controls stay deferred (4–6 products per category), but a database adapter or future UI needs no backend redesign.
5. **Independent audit before the PR.** Instead of asking the session that wrote the code whether it was done, I wrote an audit prompt and ran it in a fresh agent with no shared context: sources of truth in priority order (brief, plan, decisions), the assessment areas as the rubric, "documented cuts are not findings", "extras beyond the ACs must be tied to a predicted change, bounded and documented", read-only, and `file:line` evidence for every finding. It found two real defects (below, #7 and #8) and places where the plan had drifted from the build. It also showed the assumptions lacked impact and validation, which led to the restructured assumptions table in `DECISIONS.md` and the acceptance-criteria-to-test map in `docs/PLAN.md` §5.

## Where the AI got it wrong, and how I caught it

| # | What the AI did | How I caught it | Outcome |
| :--- | :--- | :--- | :--- |
| 1 | Its initial plan review judged the architecture without the brief, so it guessed at requirements. | I pointed it to the challenge PDF. | It re-reviewed against the actual acceptance criteria and constraints. |
| 2 | A later review over-engineered the design: a contract test suite across two adapters, a separate caching wrapper, featured products moved behind the port, a shared types package. | I compared it with the brief's "small, well-reasoned solution" and the 2–3 hour time-box, and told it to keep it MVP. | Those items became documented cuts / next steps in `DECISIONS.md`. |
| 3 | It wrote the plan before I had confirmed the frontend and backend stack (my message arrived mid-task). | Noticed and asked it to confirm. | Confirmed React + TS + Vite and Node + Express + TS; no rework needed, but I now confirm key choices before asking for large rewrites. |
| 4 | The SMTP adapter logged `SMTP send failed:` with an empty reason, because Nodemailer connection errors can have an empty `message`. | Manual smoke test of the enquiry endpoint with no SMTP server running. | The log now includes the error name and code (e.g. `AggregateError ESOCKET`). |
| 5 | The enquiry form put each label's "*" / "(optional)" on its own line: the label was a CSS grid, so every text node became a grid row. Tests passed because they don't check layout. | Clicking through the UI in a browser after the tests went green. | Wrapped the label text in a single `<span>`. |
| 6 | Closing the enquiry form after a failed send kept the error in state, so reopening the form showed the old error. The AI's tests covered submit success and failure but not close/reopen. | I found it while testing the UI by hand. | Added `reset()` to `useEnquiry`, called on Cancel, plus a regression test (confirmed it fails without the fix). |
| 7 | The docs said SES needed "only config changes", but the SMTP adapter had no way to send credentials, which SES requires. | Independent audit (moment 5). | Optional `SMTP_USER`/`SMTP_PASS` (both or neither, validated at startup); when set, TLS is required so credentials never travel in plain text. Covered by config and transport tests. |
| 8 | Docker Compose published the API port while the API trusted `X-Forwarded-For` for the rate limit, so a client calling the API directly could forge the header and bypass the limit. | Independent audit (moment 5). | The API is reachable only through nginx; the reason is recorded next to the rate-limit decision. |

## Time spent

| Activity | Time |
| :--- | :--- |
| Planning | _fill in_ |
| Building | _fill in_ |
| Testing | _fill in_ |
| Reviewing (code + docs) | _fill in_ |
| **Total** | _fill in_ |
