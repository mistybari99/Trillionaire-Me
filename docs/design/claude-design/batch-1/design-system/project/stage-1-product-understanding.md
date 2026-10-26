# Stage 1 — Product Understanding

Status: draft for owner review. Read so far: `docs/ROADMAP.md` (24 Oct 2026), `docs/spec/Trillionaire_Me_Canonical_Spec_v2_0.md` (22 Oct 2026, proposed, not frozen), `docs/design/content-first-design-brief.md`, `src/ui/styles.css`, `README.md`. **Not yet read:** Requirements Register (xlsx), `G1_Handoff_Brief`, `CLAUDE.md`, `DECISIONS_LOG.md`, `early-plan-status.md`, `owner-demand-audit.md`, `visual-references.md`, `m-list-status.md`, `src/ui/screens.ts`. Test counts and "Done" marks below are the repo's own claims; I have not run anything.

## 1. Product brief

Trillionaire Me is a Bangla-first, offline-first, phone-first (Android PWA, portable TypeScript, no framework) **goal-journey system**: the person analyses their own skills, interests and resources, sets a north star with a milestone ladder, moves through stage-gates, adapts the path when reality changes (the goal stays fixed), and records each passed gate as a journey-log achievement. Deen, health and family run as parallel tracks that are never traded for wealth. About 80% of the logic works without AI. Personal Edition now; Public Edition is schema groundwork only.

Design principles that bind every screen: diary-like simplicity, one focus at a time (1–3 tasks), no streaks/ranks/grades/scores, missed goals never red, unknown is never 0, no invented money figures, demo data until real data is approved, Deen private and unscored.

## 2. Module inventory (Spec M01–M24)

| Module | Spec scope | Repo status (per ROADMAP, unverified by me) |
|---|---|---|
| M01 Profile & consent | blank start, step-by-step, unknown states | Built (intake + field catalog) |
| M02 Discover / assessment | interests, strengths, skills, constraints | Built (O5) |
| M03 North star & ladder | multiple metrics side by side | Built (early-plan pass) |
| M04 Path & opportunity library | fit score, halal filter | Built as draft list, flagged unverified |
| M05 Stage-gate engine | gates, achievements, journey log | Built (Journey, log, report) |
| M06 Goal / project / task / habit | tree, dependencies | Built (Time & tasks, Habits) |
| M07 Resources & finance | cash flow, runway, budgets | Built (Money, 90-day cash flow) |
| M08 Time & capacity | worship time as hard constraint | Built (Time & tasks, Focus) |
| M09 Venture portfolio | many ventures, ownership % | Built (early-plan pass) |
| M10 Team & delegation | roles | Built (early-plan pass) |
| M11 Research & options | click-to-search, 2–3 options | Partly (Wikipedia cards, own options, saved list) |
| M12 Reality-changed & plan history | impact, plan-diff, approval | Built (O6, plan history) |
| M13 Deen, Ibadah, Akhirah | tracking now, content after review | Built private, no scripture text (D-D open) |
| M14 Health & family | optional, private | Not confirmed |
| M15 Risk & stop criteria | risk register | Built |
| M16 Reviews & KPIs | weekly/monthly, 90-day | Built (90-day review) |
| M17 Knowledge & sources | sources, freshness | Partly |
| M18 Visual layer | goal tree, timeline, readiness map, plan-diff | Partly (plan flow, horizon, reward art) |
| M19 Automation rules | preview and rollback | Not confirmed |
| M20 Sync, backup, export | queue, conflicts, restore | Backup/restore done; real-phone offline test still owner-only |
| M21 Security & privacy | encryption, lock-screen privacy | Lock-screen privacy done in code; device check owner-only |
| M22 Capability status & demo | implemented/demo labels | Built (24 modules registry) |
| M23 AI layer | plug-in, Gate 6 | **Not approved (D-C)** |
| M24 Template library | public-ready packs | Schema only; later |

## 3. Requirement-status matrix (design-relevant)

| Item | Status |
|---|---|
| Phone first, PC later; one 480px column | Confirmed (owner) |
| AI after launch, ~80% without it | Confirmed (owner) |
| Bangla + English parity | Confirmed, tested |
| No scores, ranks, streaks, shame colour | Confirmed guardrail |
| Deen: private, unscored, no AI fatwa, no scripture text until D-D | Confirmed guardrail |
| Theme "Ink and Paper" | Approved (D-E) in repo; **your new Light/Colorful/Futuristic brief would replace or extend it, so D-E needs a fresh decision** |
| Real personal data | Not approved (D-B); everything is demo |
| Online quote, Google search, AI plan help | Later; each needs owner approval (L1, L6, L7) |
| Clinical self-tests, AI coach, streak counters, personality scores | Declined |
| PWA vs native | Default PWA, D-A unconfirmed |
| Staff / customer viewing edition, share card | Later (G8 / G7) |

## 4. Conflicts between the new design prompt and the repo

1. **AI-generated projections and violet "AI/advanced tools" colour.** AI is not approved (D-C) and is out of scope until Gate 6. Violet may exist only as an "advanced / research" colour, not as an AI marker, until then.
2. **"Wealth & Business Intelligence" scenario comparison and readiness indicators.** The spec forbids probability percentages and forecasts without a tested model. Scenarios must be arithmetic what-ifs, labelled as such.
3. **Strategy Lab "recommendations".** The spec allows at most three rule-based options with plan-diff and mandatory approval; no silent rewrites. This matches your prompt; keep it rule-based.
4. **"Goal Universe" as a graph.** The spec requires a non-visual equivalent for every visual. The tree/list is the base; any graph is optional.
5. **Gold "milestones/premium" colour.** Fine for gate-passed moments, but must not become a score or rank signal.
6. **Red/coral for negative financial movement.** The repo says missed goals are never red. Negative cash movement may use coral; goals, habits and Deen never.
7. **Dark "Obsidian" workspaces for analytics.** The repo already ships a dark theme as tokens; selective dark workspaces would be new.
8. **Command-centre "metrics".** The spec warns against one trillion-progress % before a north-star definition is chosen.

## 5. Questions that change the design

1. Is D-E (theme) now re-opened in favour of the Light / Colorful / Futuristic direction, replacing Ink and Paper as default?
2. Which branch is the source of truth, `main` or `ccr-8b686ba2-vitt45`? They differ.
3. Do you want the five named directions (Command Center, Goal Universe, Wealth & Business, Guided Life OS, Strategy Lab) as navigation names, or should they map onto the existing 24 routes?
4. Is a wider tablet/web layout in scope now (the repo defines none)?
5. May I read the Register, `DECISIONS_LOG.md` and `CLAUDE.md` before Stage 2? I recommend yes.

## 6. Dependencies to respect

North star → ladder → gates → goals → tasks; assessment → path fit; Time & capacity (worship = hard constraint) → every plan; Reality-changed → plan versions → journey log; Money feeds ventures, runway and gate exit conditions; Deen tracks stay outside wealth gates; Capability Status tells every screen what is real vs demo.
