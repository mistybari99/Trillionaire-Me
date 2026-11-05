# UI proposal A — Calm Journey

Date: 5 November 2026. Scope: design proposal and peer debate; no runtime change or claim of a completed visual/accessibility audit.

## Grounding

I read `CLAUDE.md`, `docs/design/content-first-design-brief.md`, the Settings and multi-goal final decisions, `src/ui/styles.css`, `src/ui/themes.ts`, `src/ui/homeUi.ts`, and the Today/Journey renderers in `src/ui/screens.ts`. I visually inspected the existing Today and Journey sheets in `evidence/looks-sheets/light-futuristic-{today,journey}.jpg`. Those are historical references, not screenshots captured from this revision. In those sheets the 200% samples devote much of the first screen to shared controls and introductory content. Fresh device/browser checks remain an implementation acceptance requirement.

The Product Design index, audit and user-context skills informed the review. The audit skill requires fresh captures for audit findings; therefore this document describes source-supported design opportunities, not a new screenshot audit. The packaged user-context preflight script was not available in the workspace; no persistent user context was created or claimed.

## What the actual structure suggests

1. Today renders inspiration, stage, progress, counts and roughly twenty conditionally visible summaries/status modules before `nextActionCard()` and the task list. A user returning to finish a task must pass a potentially long stream of context first. Fixing hierarchy has more value than adding decorative cards.
2. Journey emits eighteen full-width tool links before its progress and goal list. All tools should remain available, but their equal visual weight obscures the core goal workspace.
3. `homeUi.ts` already distinguishes unknown data, personal/business money scopes, real/demo namespaces and the reason behind a rule-based suggestion. These are product semantics to preserve, not copy to shorten away for appearance.
4. Light Futuristic already supplies purple tokens, translucent cards, shadows and rounded corners. A new color system is unnecessary; hierarchy and restraint can make the existing look feel more intentional.

## Original A direction

“Calm Journey”: a legible Bangla daily page with an editorial heading, a single prominent next action and a compact daily agenda; a quieter journey rail to show the current stage. I initially considered sapphire/teal accents and an always-present next-action card. After B's critique, both choices are withdrawn: the existing purple identity is stronger, and an extra action card would duplicate a task already present in the agenda.

## Revised layout offered to B

### Today

- Keep save failure, lock/consent requirements, important restore/namespace notices and other safety controls above the workspace. A compact normal mode label must still distinguish demo from real data. “Online” is network status only; never imply account sync or cloud backup.
- Date and one plain page heading, with a compact stage/context link. Use the existing bundled Bengali heading face sparingly; use Hind Siliguri for reading and controls. No fixed-height hero or oversized wealth number.
- Make the active daily task list the primary surface. When the next-action engine selects `do_task`, promote/highlight that actual existing task in the list; avoid a second task card or a second completion control. Do not silently reorder the rest of a user-managed plan.
- When the next suggestion is setup, linking, adding money or review, show one compact action band with its existing explanation and destination. It must not pretend to be AI. If no suggestion applies, omit the band.
- Show actionable due/attention items next; display actual records and dates, with neutral wording. Define the urgent set in implementation from existing due-state helpers, not a new speculative priority algorithm. No dismissal that silently hides obligations.
- Secondary sections follow: progress and counts, money, other track summaries, inspiration/advice and tools. Initially use visible section headings/anchor links rather than a mass conversion to collapsed content. No feature vanishes from the app.
- Empty real data uses honest “not added yet” language and one relevant existing add action. It must not become a wall of zero metrics or demo figures.

### Journey

- Heading, compact current-stage strip, active goal workspace. Stage A–H stays distinct from build gates G0–G8. Stage estimates retain their provenance.
- Goal cards show title, status, existing count/progress semantics and next available navigation. Shared tasks continue to count exactly as the approved multi-goal decision specifies; no visual roll-up invents a new metric.
- Replace the eighteen equal-weight full-width tool buttons with a short directory grouped by task: planning, reviews, and exploration/history. Final Bangla labels must follow the existing glossary; these are conceptual group names. Provide all existing destinations without nested horizontal scrolling or tab overflow.
- Keep a clear path to all stages and stage rules; a compact strip is not a replacement for the ladder/detail screen.

### Other screens and navigation

- Keep five existing tabs: Today, Journey, Diary, Deen, Settings, with current route IDs. Preserve the approved Settings category structure; group appearance changes must not restart that IA debate.
- Use lists/forms for entries, readable tables for finance, and goal trees for goal relationships. A universal metric-card grid would weaken the content-first brief.
- Keep Deen a separate respectful workspace. No piety score, ranking, celebratory streak or overdue shame. No religious decoration spread across unrelated workflows.

## Visual specification

- Retain all four saved theme IDs and automatic phone dark mode. Light Futuristic remains default, including purple primary. Moss denotes appropriate existing positive states; danger is reserved for destructive/error states, never an unfinished goal.
- Use a nearly flat white/dark surface for ordinary sections; one restrained shadow for the main workspace or overlay. Avoid blur/backdrop-filter on every scrolling card. Keep the distinctive soft page tint and a thin accent only where it guides action.
- Spacing rhythm 8/12/16/24 CSS pixels; modest 12–16px corners in Light Futuristic. Keep alternate themes' existing character instead of applying the futuristic shape everywhere.
- Body target 17px with current 1.7 Bengali line-height; short headings around 26–28px at normal scale. Text must wrap naturally. Never truncate a goal title, warning, financial scope or reason merely to fit a card.
- Controls remain at least 44×44px, primary inputs/buttons retain current larger 48/52px sizes. Icons supplement visible labels; they do not replace Bangla navigation labels.
- At normal 360px viewport, five navigation items must fit without clipped text. At 200% text, permit wrapping and document flow, with adequate bottom space and safe area so fixed navigation cannot cover controls. Do not promise the full task content fits one screen at enlarged text.

## Acceptance before calling this implemented

1. Fresh captures for Today, Journey, plan, money, Deen and Settings at 360px and a larger viewport; Bangla and English; light and dark; a representative 200% text view. Include empty real, demo and populated synthetic records, plus save-failure state. Never use real personal/financial/Deen records as demo evidence.
2. At normal text with ordinary non-warning fixture content, the daily work starts before supplementary summaries. At 200%, all controls remain reachable with no overlapping nav, clipping or horizontal page scroll.
3. All existing destinations and provenance labels remain reachable. Unknown is distinct from zero; personal/business totals remain separate; demo/real labels survive the refresh.
4. Keyboard focus, route heading focus, control names and visible focus styles must be tested; measure contrast for changed token pairs and boundaries. Screenshots alone do not establish accessibility compliance.
5. No new network request, hosted asset, paid dependency, cloud sync, AI setting or data-model change. Bundled fonts and offline behavior remain intact. Reduced motion remains respected.

## Debate status

I sent B the original direction, received their “Action Desk” proposal, and accepted its existing purple identity and list-first hierarchy. I requested a compact stage strip near the Journey heading, explicit data-safety precedence, preservation of rule explanations, and a grouped directory that retains every tool. B accepted those points. We also agreed that task highlighting preserves existing plan order and that large-text navigation clearance covers the body, update banner and every fixed overlay.

I read the complete [joint decision](UI_REFRESH_2026-11-05_DECISION.md) after B wrote it and explicitly approved its final substance and exact Today/Journey builder/destination mapping. No design objection remains. B owns that final selection document; this proposal is the dissent/concession record, not a competing implementation instruction. Final locale wording and fresh browser/device/accessibility verification remain implementation work; neither designer claims those checks have passed.
