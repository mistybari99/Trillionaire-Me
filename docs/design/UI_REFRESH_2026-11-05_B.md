# UI direction B — Action Desk

Date: 2026-11-05. Author: design agent B. Status: design recommendation; no UI implementation or fresh screenshot verification is claimed.

## Grounding and product understanding

Trillionaire Me connects personal context, goals, practical steps, money, business and reflection in a private, offline-first app. Its larger life/business vision must remain visible through dedicated workspaces; Today does not need to display every module at once. Deen remains an integrated private workspace without worship scores, ranking or shame.

Inspected: `CLAUDE.md`, `docs/design/content-first-design-brief.md`, `src/ui/screens.ts` Today/Journey/Diary/review sections, `src/ui/themes.ts`, `src/ui/styles.css`, `src/ui/onboardUi.ts`, and the goal list/detail portions of `src/ui/lifeUi.ts`. Selected excerpts of the handoff brief and `docs/design/ui-polish-spec.md` were also read; this is not a claim of a complete canonical-spec audit. `evidence/looks-sheets/light-futuristic-today.jpg` was visually inspected as a historical contact sheet. It shows very little actionable content in the first viewport, especially with large text; its dated appearance is not evidence of current rendering.

Product Design index, user-context and get-context skills informed the workflow. The supplied user-context preflight script reported no saved context. Shared critical-overrides resource could not be read through the skill service; local owner instructions and the supplied brief remain the usable grounding.

Confirmed by inspected implementation: 5 main tabs, multiple selectable themes, owner-approved Light Futuristic default, local namespaces and explicit demo labels, goal/task links, stage A–H, consent gating, guided first goal/step, compact/detailed views, unknown values. Proposed here: information order, grouped entry points and selective surface treatments. Unverified: final Bangla labels for new groups, current rendered metrics, full module coverage and existing test coverage. No new backend, algorithm or cloud capability is proposed.

## Independent position

Keep the purple Light Futuristic identity, but make each workspace read like an action document: one clear title, useful rows and an obvious next step. White surfaces, disciplined whitespace and a single accent edge replace a wall of equally raised glass cards. Preserve the current palette and font assets. A futuristic identity can come from precise geometry, a quiet header wash and clear selection states rather than constant blur or animated decoration.

This differs from an initial hero-led design: the actual agenda is the hero. Do not repeat a recommended task in a large feature card and again in the list. Do not introduce a new color system just to announce a refresh.

## Content hierarchy and navigation

Keep Today, Journey, Diary, Deen and Settings labels/routes. Existing links remain reachable; no feature is removed. Hash routes and selected theme IDs remain stable. Grouped entry rows replace repeated full-width equal-priority buttons. All new labels must use the existing terminology and locale registry.

Today order:

1. Current namespace/mode, date and compact heading. A real save/storage/security/namespace warning takes precedence when present. Network status describes connectivity only; it never promises cloud sync or implies local editing needs internet.
2. The existing next action once. For a task recommendation, highlight that same task in the current plan list, preserving existing plan order/logic. For a setup/review/link action, use a compact reason-and-action band with the existing explanation.
3. Current plan task rows: title, known minutes or Unknown, existing status, goal context and existing completion/focus actions. A long title wraps; actions wrap beneath text. No invented generated tasks or changed scheduling rules.
4. Existing time-sensitive reminders/attention, only where records support them. Storage failure never waits here; it remains at the top. No red overdue shame.
5. Secondary grouped summaries and entry links to existing money, health, team, business and review workspaces. Missing values read Unknown or Not enough data. Empty conditional groups may be omitted, but routes remain reachable.
6. Stage/progress context, inspiration and optional exploration below practical work. Do not delete inspiration or domain functionality to make Today shorter.

Journey order: title → compact current stage strip → active goals → one existing create-goal entry → grouped existing planning, review/history and exploration links → full stage ladder. The stage strip preserves name and estimate/provenance labels; it does not use a giant fraction. Goals lead because this screen connects intention to work. Stage A–H must never be confused with engineering gates G0–G8.

Diary keeps context/profile entry and relevant next field together; money, ventures, team and health use their own existing routes, not a generic metric-card layout. Settings uses grouped labeled rows for existing appearance, data, protection and information routes. Deen uses private logs and source/status information with no new cross-module worship summary.

First run remains the existing demo/real choice with consent → one plain-language গোল → one ছোট কাজ → first action/later. Keep skip visible, preserve entered text on errors and distinguish demo from আসল ডাটা. Do not add a marketing carousel or require an account/network. Full profile completeness is secondary, never an entry barrier.

## Goal and task workspaces

Goal detail should prioritize goal title/status, parent/part relationship, unknown-aware progress and linked steps. Keep shared-step “also serves” labels and paused/retired history. Reveal SMART guidance, hierarchy/measurement editing and SWOT through clearly titled sections after current work; do not change record meaning or auto-fill facts. Keep destructive actions at the end, with existing explicit confirmation.

Plan/task views retain current planner, explanations, capacity and goal links. Separate task title from metadata and actions. Completed work receives neutral text/tick; open tasks remain readable without large ranking numbers. The existing first-run step is reused in the normal plan, not represented by a second fake dashboard action.

## Visual and interaction system

| Role | Recommendation |
| --- | --- |
| Color | Keep `--primary` purple (`#4B3FD8` in LF light), existing dark counterpart and semantic tokens. Moss means completion; danger means actual failure/destruction. Demo keeps its own labeled treatment. Never encode state only by color. |
| Surfaces | Opaque card for body text/forms/task lists; quiet page wash near heading; at most one raised action surface in a local section. No nested glass stacks or heavy backdrop blur on every row. |
| Type | Existing Hind Siliguri body and Noto Serif Bengali/Fraunces headings. Body 1.0625rem/1.7; UI labels at least .875rem/1.5; provenance should remain readable at .875rem. No forced uppercase/letter spacing in Bangla. Latin digits per owner convention. |
| Spacing | 16px phone gutter; 8/12/16/24px rhythm; 12–16px surface radius and 48px main controls. Keep content max 480px. |
| Buttons | One locally primary action; secondary actions as labeled outline/quiet buttons. Min 44px taps, visible focus, labels remain visible. No floating global create menu introducing new behavior. |
| Motion | Optional 120–200ms color/opacity feedback. No looping background/glow effects, parallax or spatial page transitions. Respect OS and app reduced-motion settings. Existing rewards stay scoped to their current supported context. |

This proposal refines the direction of `ui-polish-spec.md`, not an instruction to build its entire component migration. Reuse its spacing/control/semantic-role ideas where appropriate. Deliberate difference: routine content surfaces are opaque and flatter instead of uniform glass. Validate contrast on rendered backgrounds before applying any translucency.

## State and accessibility contracts

Empty is actionable and calm: no real goal → existing add-goal link; no task → existing add/plan entry. Unknown is explicit; do not draw a 0% ring for missing values or use fabricated currency totals. A known zero remains zero. Demo content remains labeled, never an automatic fallback for missing real data.

Loading shows a short local-storage loading status only while work is actually pending; never an endless cloud spinner. A failure preserves typed values where possible, states that save did not complete, and exposes the supported retry/recovery path. Success is announced only after durable persistence is acknowledged. Offline is a small factual connectivity state; location/prayer-source failures stay with their own feature and retain source/freshness labels.

At 360px and 200% text: single column, no clipped Bangla vowel marks, no fixed-height cards, no text ellipsis for task/goal names, no hidden primary actions, no horizontal page scroll. Task trailing actions wrap. All 5 bottom labels remain; allow a measured two-row bar and reserve its actual height plus safe-area padding. Do not shrink labels or turn navigation icon-only. Keyboard focus/scroll-to-error must land above the navigation and on-screen keyboard.

Require 4.5:1 normal text,3:1 large text/nontext controls,44px taps, visible focus, logical headings and meaningful form labels. TalkBack announces value provenance, Unknown and current navigation. Changes to existing aria-live/errors must not double-announce every rerender. Respect light/dark/auto and all 4 saved design IDs; keep content changes shared, style tokens theme-specific.

## Delivery and validation

Start with source-backed content inventory and a static Today/goal layout using existing states; then implement small presentation changes after the design decision is reviewed in the parent work. Do not claim feature completeness from a prototype.

Acceptance requires fresh screenshots at 360px: Bangla and English,100% and 200%, light/dark, populated/empty/unknown/error/offline. Spot-check the other 3 themes so a LF refinement cannot break saved looks. Check route reachability, all 5 nav labels and keyboard/TalkBack behavior. Use existing meaningful e2e contracts for task completion, consent and data namespace; no new data behavior should be needed for this refresh.

## Debate contribution

Agent A initially favored a calm hero-led Journey direction with teal/sapphire accents. B challenged the new palette and repeated hero/task presentation; A accepted the existing purple identity and single task representation. A argued for stage context near the Journey title and preserving every tool through grouping. B accepted a compact stage strip before goals and a compact reason-band for non-task next actions. The joint decision records the actual final agreement separately.
