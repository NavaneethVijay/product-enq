# AI Usage

> Running log. Add entries as they happen, not at the end. Covers what the brief asks for: tools and models, agent instruction files, plan/spec, 3–5 key moments, and where the AI was wrong and how it was caught.

## Tools and models

| Tool | Model | Used for |
| :--- | :--- | :--- |
| Claude Code (CLI) | Claude Opus 5.5 (`claude-opus-5-5`) | Reviewing the plan against the brief, writing the plan/spec and project docs, implementation (planned). |
| _add others if used_ | | |

## Agent instruction files (committed)

- `AGENTS.md`: the single set of rules for any AI agent: scope guardrails, fixed stack, architecture rules, coding/testing conventions, workflow, status.
- `CLAUDE.md`: a short pointer so Claude Code loads `AGENTS.md` automatically.

## Plan / spec

- `docs/PLAN.md`: combined plan and spec, written before coding. It maps every acceptance criterion, constraint and deliverable from the brief to a decision, and quotes the brief verbatim in its Appendix so new AI sessions don't have to guess the scope.
- Process: before writing any code, I designed the plan with the AI, checked its suggestions against the brief, pushed back where it overreached, and agreed the final version in `docs/PLAN.md`.

## Key prompts and moments

1. **Asking for a plan review before any code.** I asked the AI to review the proposed architecture and give feedback. It flagged real gaps: no fallback if fakestoreapi.com is down (the demo would break for reviewers), unclear category slugs (`"men's clothing"`), the `/featured` vs `/:id` route-order bug, the risk of a `shared/` types folder in Docker builds, and missing env vars (e.g. sales inbox address).
2. **Grounding the AI in the brief.** I pointed it at the challenge PDF. It then noticed the plan had no seam for the look-and-feel change the brief predicts, so I added a CSS-variable theme and props-only components.
3. **Pushing back on over-engineering.** Prompt: *"this is like a mvp and we do not want to over complicate it but build it right enough to show case this can be reused and scaled for production."* The design was kept to five pieces: two ports, `createApp(deps)`, Zod at the edge, and a theme file. Each one maps to a change the brief predicts.
4. **Locking scope for future sessions.** Prompt: asked for the plan to capture everything so *"any new conversation started should be able to easily pick up the scope and not hallucinate it."* Result: `docs/PLAN.md` with the verbatim brief appendix, an explicit out-of-scope list, and `AGENTS.md` rules saying "not in the plan = out of scope, ask first".
5. _(Add a build-phase moment here.)_

## Where the AI got it wrong, and how I caught it

| # | What the AI did | How I caught it | Outcome |
| :--- | :--- | :--- | :--- |
| 1 | Its initial plan review judged the architecture without the brief, so it guessed at requirements. | I pointed it to the challenge PDF. | It re-reviewed against the actual acceptance criteria and constraints. |
| 2 | A later review over-engineered the design: a contract test suite across two adapters, a separate caching wrapper, featured products moved behind the port, a shared types package. | I compared it with the brief's "small, well-reasoned solution" and the 2–3 hour time-box, and told it to keep it MVP. | Those items became documented cuts / next steps in `DECISIONS.md`. |
| 3 | It wrote the plan before I had confirmed the frontend and backend stack (my message arrived mid-task). | Noticed and asked it to confirm. | Confirmed React + TS + Vite and Node + Express + TS; no rework needed, but I now confirm key choices before asking for large rewrites. |
| _4+_ | _(build-phase entries)_ | | |

## Time spent

| Activity | Time |
| :--- | :--- |
| Planning | _fill in_ |
| Building | _fill in_ |
| Testing | _fill in_ |
| Reviewing (code + docs) | _fill in_ |
| **Total** | _fill in_ |
