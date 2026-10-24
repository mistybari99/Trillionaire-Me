# Life Success & Personal Development System — integration plan
Source: owner's design brief (23 Oct 2026). Authority: Spec > Register > this plan. Decisions logged in DECISIONS_LOG (L-21…L-24).

## 1. What we keep from the brief (accepted as-is)
- The 4 layers: **Goal Architecture · Human Capability · Obstacle & Solution Center · Execution & Growth.**
- The chain: Vision → Strategy → Knowledge → Skills → Decisions → Daily Actions → Feedback → Adaptation → Goal Progress.
- 20 categories as a **knowledge library** (not as 20 menu items) with one shared tag system and the 12-field entry schema (`src/library/categories.ts`).
- The 5-step problem loop: **Identify → Diagnose → Intervene → Execute → Measure & Adapt**.
- Principles: goal-driven, problem-driven, evidence/feedback-driven.

## 2. Where it fits in what already exists
| Brief layer | Already built | Missing (new) |
|---|---|---|
| Goal Architecture | goal tree, stages A–H, journey log, free-window planner | goal view (tree screen), dependency map, backward planning, risk register (M15) |
| Human Capability | diary intake (interests/strengths/values/skills), glossary | skill-gap map, knowledge-gap list, learning roadmap |
| Obstacle & Solution Center | pause / minimum-week modes, calm copy | **"Why am I stuck?" flow (new M25)**, obstacle register, solution library |
| Execution & Growth | Today (1–3 actions), Time & tasks, Money | habits + recovery plan, weekly review, consistency trend, plan-vs-actual |

## 3. Navigation: keep 5 phone tabs, map the brief's 9 areas into them
| Brief area | Lives in |
|---|---|
| Overview / Life Dashboard + Daily Execution | **Today** (+ a permanent "I'm stuck" button → M25 flow) |
| My Goals, Decision & Strategy, Progress & Insights | **Journey** |
| Personal Development, Knowledge & Skills | **Diary** |
| (not in the brief) Deen | **Deen** — added as category 21; the brief omitted it, Spec DP-12 requires it |
| Problems & Solutions library, Life Toolkit | **More → Toolkit**, and reached from Today's "I'm stuck" |
Reason: Spec DP-03 (one focus at a time, phone first). A 9-item sidebar would break it.

## 4. Conflicts with the Spec and how they are resolved
| Brief says | Spec/Charter says | Resolution |
|---|---|---|
| `streak-management` | no streak-shame (CLAUDE.md §2, §6) | habits show **consistency trend + recovery plan**; no streak counters, no red days |
| red days → "find the reason" | missed goals never punishing | adopted: a gap prompts a gentle "what got in the way?" (sleep, load, unclear next step…) |
| health & emotion advice | AI/advice limits, TM-REQ-151 | evidence_level + safety_notes on every entry; emotional-health entries carry "seek a professional" and are never presented as treatment; **human review before shipping** |
| guides/solutions content | never invent facts (§6) | library ships empty-by-default; each entry needs sources + date + `reviewed:true`; `unverified` is never shown as advice |
| categories 09/19/20 overlap Deen | Deen first-class, private | Deen stays its own category and tab; no score, no shared content |
| visual libraries (6 families) | G3 scope, text equivalents | build 5 first as brief suggests (Goal Tree, Daily Execution, Consistency Trend, Problem Diagnosis, Skill Gap Map), each with a text/form equivalent (TM-REQ-068) |

## 5. Build phases (each = one PR with tests + evidence)
**P1 — Obstacle Center core (the signature feature).**
`M25`: rule-based diagnosis (no AI): user picks the stuck situation → answers 4–6 yes/no/unknown questions → ranked likely causes (unclear next step · too big · tired · fear · missing knowledge/resource · overload) → 1–3 interventions → "next small action" is written as a task into Today → follow-up check ("did it help?") feeds the review. Unknown answers stay unknown (no forced cause).
**P2 — Goal view + Skill/Knowledge gap.** Goal tree screen (+ text list), dependency map, skill-gap map from diary skills vs. what the goal needs, knowledge-gap queue (links into in-app Suggest).
**P3 — Habits + review.** Habit with recovery/restart protocol, weekly review, consistency trend, planned-vs-actual (uses the real plan).
**P4 — Library content.** Tag system live; authored entries for the top problems (procrastination, focus, overwhelm, decision paralysis); every entry reviewed. Health/emotion entries last, after reviewer sign-off.
Later (G6, needs owner approval of cost): AI explains/synthesises; everything above works without AI (DP-08).

## 6. New requirements added to the Register copy (TM-REQ-173…180, all "Not verified")
173 Life-Success knowledge library with shared tag system · 174 "I'm stuck" 5-step problem loop · 175 rule-based diagnosis, unknown stays unknown · 176 evidence level + sources + safety notes on every entry · 177 emotional/health content: professional-help notice, human review gate · 178 habits: recovery plan, no streak shaming · 179 skill-gap + knowledge-gap maps with text equivalents · 180 gap-reason prompt after missed days (non-punitive).

## 7. What needs the owner
- Reviewer for health/emotional-health content (Charter §4.6) — before P4 ships those entries.
- Nothing else; phases P1–P3 proceed now.
