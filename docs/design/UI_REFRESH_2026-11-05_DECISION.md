# UI refresh decision — Action Desk

Date: 2026-11-05. Participants: independent design agents A and B, requested by the owner. Status: jointly selected design recommendation; this document does not claim owner approval, implementation, a live UI audit or deployment.

## Decision and rationale

Select **Action Desk**, retaining the owner-approved Light Futuristic purple identity, with a compact current-stage strip on Journey and a conditional next-action reason-band. Actual daily work should precede inspiration and broad summary stacks. Dedicated goal, finance, business, personal-context and Deen workspaces remain; this is not a reduction of the product vision to a task tracker.

The strongest finding from inspected source is content order: `today()` constructs inspiration, a large stage treatment and many summary cards before today's task rows; `journey()` has 18 similarly weighted tool links before active goal content. Resolving that hierarchy provides more practical improvement than replacing colors or adding motion. Historical look sheets support a concern about first-viewport density, but current rendering still needs fresh verification.

## Alternatives and actual debate

| Agent | Independent opening position | Challenge from the other agent | Final concession |
| --- | --- | --- | --- |
| A — Calm Journey | Calm editorial Bangla hierarchy, prominent next action, stage context and restrained teal/sapphire accents. | B argued that a new palette weakens the existing approved identity and a task hero plus agenda repeats the same action. | A withdrew the palette replacement, accepted existing purple and one representation of the selected task. |
| B — Action Desk | Flat practical workspaces, agenda first, existing purple, goal list ahead of stage-heavy presentation. | A argued that stage context must remain near Journey's heading; tool grouping must preserve every existing route; non-task next actions still need their existing reason. | B accepted the compact stage strip before goals, grouped rather than removed tools, and a conditional reason-band for non-task actions. |

Both agreed through direct messages that plan ordering stays unchanged: a recommended task is highlighted/anchored in the existing list, never reranked by presentation code. Both also agreed to preserve 5 labeled navigation routes and allow wrapping at 200% only with measured reserved space. Agent A explicitly approved this joint direction before this record was written; final artifact review is recorded below after inspection.

Proposals: [A](UI_REFRESH_2026-11-05_A.md), [B](UI_REFRESH_2026-11-05_B.md). Both are source-informed recommendations, not generated design screenshots or a completed interaction prototype. No new visual option or mockup has been implemented in this design pass.

## Selected coherent interface

### Global shell and navigation

- Preserve Today, Journey, Diary, Deen and Settings, existing hash routes, design IDs and saved preferences. Use current locale keys where possible; new group labels need plain Bangla/Mix/English wording consistent with the owner glossary.
- Keep mode/namespace explicit. Demo is labeled; real data never falls back to demo fixtures. Online/offline describes connectivity and must not imply cloud backup/sync.
- Real storage/save/security/namespace problems take precedence over content. Keep errors close to the affected field as well. Do not show false success or move necessary warnings into collapsed summaries.
- Use one-column content at 360px,16px gutters, max 480px. Keep all 5 navigation labels visible. At large text, permit a two-row bottom bar and reserve its measured height plus safe area. No icon-only fallback or horizontal nav scrolling.

### Today and first run

Reading order: mode/date/heading → mandatory warnings → existing next action once → current plan task rows → actual due reminders → grouped secondary summaries/tools → stage/progress detail and inspiration. Global warnings can appear before the heading where the current shell requires it.

Exact builder placement for the current `today()` inventory (keep each builder's existing conditions and provenance):

| Order | Content/builders |
| --- | --- |
| 0 | Existing shell critical storage/save/security/namespace banners; `pausedCard` consent warning. Never collapse or relocate these into optional detail. |
| 1 | `greeting`, date, `logo-row`/heading and existing namespace presentation; `pauseChip` remains visible as relevant plan context. |
| 2 | Conditional `nextActionCard` reason-band for non-task actions; `home.tasks` heading and `viewBar("today")`; existing `todayFromPlan` or namespace-appropriate empty/demo content. For a task action, no separate `nextActionCard` task surface: attach its existing reason/highlight/anchor to the one existing task row. |
| 3 | Existing action links in their current order: `#/diary/intake`, `#/habits`, `#/stuck`, `#/capture`; style intake as the locally primary entry and remaining links as secondary. Do not give every link hero weight. |
| 4 | Attention section, existing conditions retained: `riskDueCard`, `gateDueCard`, `remindersTodayCard`, `missedTodayCard`, `goalDateReminders`, `backupReminderCard`. Keep existing privacy/worship-detail filtering. |
| 5 | Context section: `welcomeBackCard`, `movedNoteCard`, existing `next-step` profile hint. Preserve dismiss/continue actions and their current semantics. |
| 6 | Summary section, in this exact internal order: `overallProgressCard`, `homeCountCards`, `kpiTodayCard`, `northStarCard`, `teamCard`, `blocksTodayCard`, `healthCard`, `deenTodayCard`, `realityTodayCard`, `homeSummaryCards`, `portfolioCard`, `adviceCardsView`. Each retains its conditions and links; grouped headings may organize presentation without changing calculations. |
| 7 | Existing `home.step` stage text, compact current-stage treatment/rungs, inspiration card, `rulesTodayCard`, `disclaimers`. All provenance/source text stays with its value. |

This is an implementation mapping, not permission to change what a builder calculates or displays. If a summary builder also contains an actual blocking error, preserve the error in the priority layer before moving its nonblocking summary. No hidden default that suppresses consent/source labels is allowed.

For `do_task`, highlight and optionally anchor to the already selected task row in the existing planner order. Do not duplicate that task in a hero or sort the list. For setup/review/link/money suggestions, show a compact reason-band reusing the existing engine explanation and destination. No new recommendation engine is introduced.

Empty real-data setup has one relevant existing setup/add action and honest unknown state. It does not need a fake task row. A priority warning may occupy the first viewport. Full profile completion is never required to start.

Keep the implemented demo/real consent choice → one goal → one small step → existing done/later flow, with skip. Preserve inputs on recoverable failures and describe local storage plainly. No account gate, marketing carousel or invented cloud consent.

### Journey and goal/task workspaces

Journey: title → compact named stage strip with provenance → active goals/create entry → grouped existing tools → full stage ladder. Do not confuse A–H journey stages with G0–G8 build gates. Stage labels remain, oversized fraction loses priority.

Group the existing tool destinations by planning, review/history and exploration, using a verified route inventory before editing. These group names are provisional until checked against locale/glossary; no link is removed. Full feature trees need not expand on the entry page.

Exact mapping of all 18 tool links currently emitted by `journey()`:

| Group, displayed in this order | Existing destinations, displayed in this order |
| --- | --- |
| Goals and plan | `#/journey/boards`, `#/journey/horizon`, `#/journey/decide`, `#/journey/risks`, `#/journey/reality`, `#/journey/northstar`, `#/journey/kpi` |
| Review and history | `#/journey/log`, `#/journey/report`, `#/journey/week`, `#/journey/month`, `#/journey/review`, `#/journey/history` |
| Explore existing tools | `#/journey/universe`, `#/journey/art`, `#/journey/mine`, `#/journey/legs`, `#/journey/leak` |

Reuse the existing destination labels (`bd.link`, `horizon.link`, etc.). The grouping is presentational; it does not rename or merge any tool. `passedBanner` remains near the title. After the active-goal section and grouped tools, retain `overallProgressCard`, `northStarCard`, `templatePicker`, `viewBar`, full `stageLadder`, module slots and disclaimers. Keep `goalFunnelHero` as a secondary goal-context visualization after the active goals, without using it to replace the goal list or invent totals.

Goal detail: title/status/parent context → unknown-aware progress and linked steps → clearly titled SMART, hierarchy/measurement and SWOT sections → existing destructive controls at the end. Preserve shared-task links, paused/retired history and all existing calculations. Do not add new editing affordances unsupported by the implementation.

Plan/task rows show title, known minutes/Unknown, status, goal context and existing completion/focus actions. At large text, actions move below the description. No new rankings, streaks or decorative priority numbers. Diary keeps profile/next field together and routes to actual specialized money/business/team/health screens. Deen remains private and respectful without worship scores or competitive progress.

### Visual language

Retain LF light purple `#4B3FD8`, its existing dark counterpart, semantic color roles and bundled Hind Siliguri / Noto Serif Bengali / Fraunces. Preserve other 3 selectable looks and follow device dark mode. New component styling uses theme tokens, not LF hex values scattered into screens.

Use opaque content/forms/task surfaces, quiet header wash,12–16px radius, restrained border/shadow and a single locally primary action. Keep current 52px primary buttons and 48px inputs;44px is the floor for secondary targets. Reserve glass/accent depth for the shell or selected action; avoid applying identical blurred raised cards to every domain summary. This is a deliberate refinement of the uniform-glass portions of `ui-polish-spec.md`; adopt its useful spacing/control tokens incrementally without requiring a wholesale component rewrite.

Token contract: preserve all current color-role names and 4 design IDs; `--primary/--on-primary` action and selection, `--moss` recorded completion, `--calm` informational prerequisite, `--demo/--demo-bg` provenance, `--danger` actual failure/destructive confirmation, `--ember` attention/focus. Keep `--paper/--card/--ink/--muted/--rule` theme-controlled. No raw LF color in shared components; no theme/preference migration. Any added spacing/radius/elevation token needs defaults for every look and dark mode.

Body stays around 1.0625rem/1.7. Essential metadata/provenance aims for at least .875rem/1.5. Bangla must keep vowel marks and natural wrapping; no forced letter spacing, decorative uppercase or thin low-contrast labels. Use Latin digits as currently specified.

Optional 120–200ms color/opacity feedback respects both OS and app reduced-motion preferences. No animated background, parallax, endless glow or new celebration system. Existing reward behavior remains scoped; state changes remain understandable with motion disabled.

### State contracts

| State | Required behavior |
| --- | --- |
| Empty | Explain what is absent and offer one relevant supported add/setup action. No fake demo fallback. |
| Unknown/incomplete | Show Unknown/Not enough data with provenance; no fabricated 0, 0%, money total or progress ring. A recorded zero stays 0. |
| Local pending | Show a truthful short storage/loading/saving state only while pending. Avoid invented cloud synchronization UI. |
| Save/storage error | Preserve input where possible, say save failed, expose supported recovery/retry. Announce success only after acknowledged persistence. |
| Offline | Keep local editing paths available; distinguish connectivity from storage health. External source errors/freshness stay with that feature. |
| Private/Deen | No cross-user comparison, spiritual grading, shame, rank or new scripture/fatwa behavior. |

## Rejected tradeoffs

- New teal/sapphire default palette: loses approved purple identity without helping the workflow.
- Large next-task hero plus repeated task: wastes phone space and creates competing completion controls.
- Giant stage fraction as the main Journey content: delays useful goal selection. Removing stage context entirely also loses orientation.
- Deleting links/cards to simplify: hides capabilities. Group and reorder supported content, preserving route reachability and priority warnings.
- Uniform glass, tiny chips or icon-only navigation: visual novelty does not justify poorer contrast, Bangla legibility, performance or large-text usability.
- Any new AI/paid/cloud or worship-scoring behavior: outside this authorized design scope.

## Implementation phases and checkable acceptance

1. **Inventory and layout proof.** Map every existing Today block and all 18 Journey links to its new location; preserve conditional/warning/provenance rules. Produce a small reviewable layout using actual app states. Acceptance: no orphaned route, no invented data, task ordering unchanged, existing localized terms preserved.
2. **Today and Journey presentation.** Reorder existing builders; highlight existing task once; add grouped link presentation and compact stage context. Acceptance: with normal populated records at 360×800/100%, task content appears before broad summaries; with empty records an existing setup action is visible; critical warnings remain immediately discoverable. No fixed fold requirement at 200% or when warnings dominate.
3. **Reusable surfaces and goal/task reading order.** Apply selective opacity/spacing/type/control refinements; scope theme-specific changes. Acceptance: all existing 4 theme IDs work in light/dark, completion/focus/goal links stay functional, no new persistence or recommendation behavior is required.
4. **Fresh state/accessibility verification.** Capture 360px Bangla and English at 100% and 200%, LF light/dark; cover populated, empty, unknown, save error and offline. Spot-check other 3 looks. Acceptance: no horizontal page scroll, clipped Bangla marks, missing nav label, obscured last control, inaccessible focus or duplicate task action. Every interactive target is at least 44px; normal text meets 4.5:1, large text/nontext controls 3:1. Check TalkBack names/current tab and keyboard/error focus. Reserve actual measured navigation clearance for body, update banner and every fixed overlay; the current fixed update-banner 72px offset must not survive unchanged when nav wraps. Reuse meaningful existing e2e flows for consent, namespaces, tasks and offline behavior; add tests only for changed contracts.

## Review record and limits

Joint direction agreed by A and B in direct discussion on 2026-11-05. Final artifact review: A read the complete decision and explicitly approved the final substance, exact Today/Journey mapping and consent-warning priority on 2026-11-05. B accepts the same recorded selection. No unresolved design objection remains between the two agents. No user approval is inferred from agent agreement. Engineering reliability fixes proceed separately; these documents do not claim UI code, preview captures, accessibility tests, Cloudflare connection or deployment completed.
