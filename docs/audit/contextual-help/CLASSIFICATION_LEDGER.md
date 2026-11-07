# Contextual-help classification ledger

Baseline: committed `f3c7604`, isolated archive. Source classification is complete; fresh browser observations follow after capture.

Inventory: 144 help/intro/description keys with source occurrences; 34 settings rows; 12 guide records; 186 catalog fields.

## Narrow optional-intro allowlist

Only these exact builders can move into optional Help. Do not hide all `.sub`/`.muted` paragraphs. Units, formats, limits, privacy, consent, warnings, source and Unknown text always stay inline.

| Key | Route / selector hint | Source | Reason |
|---|---|---|---|
| `cards.intro` | `#/cards` / `main > p.sub` | `src/ui/screens.ts` (baseline line 977) | Short general flashcard description; no units, limits, warnings or consent. |
| `focus.intro` | `#/focus/:taskId` / `main#focus-root > p.muted` | `src/ui/screens.ts` (baseline line 853) | Redundant one-task/one-timer description. |
| `focus.tip` | `#/focus/:taskId` / `[data-focus-tip]` | `src/ui/screens.ts` (baseline line 853) | General one-small-step tip; timer and task remain visible. |
| `bd.intro` | `#/journey/boards` / `main.scr-boards > p.sub` | `src/ui/boardsUi.ts` (baseline line 72) | Board overview; preserve every actual text-view control. |
| `kn.n.intro` | `#/notes` / `[data-kn-section=notes] > p.muted` | `src/ui/notesUi.ts` (baseline line 93) | General note/link explanation; leave form labels and save feedback. |
| `kn.p.intro` | `#/notes` / `[data-kn-section=sops] > p.muted` | `src/ui/notesUi.ts` (baseline line 120) | General procedure explanation; leave role/source/step constraints. |

## Classification meaning

- MustVisible: operational facts, safety/privacy/consent/namespace/error/Unknown/units/formats/limits. Never hide wholesale.
- BriefInline: concise action or interpretation guidance; retain by default.
- OptionalHelp: reviewed, nonessential explanatory prose; keep reachable from explicit local Help.
- Reference: guide, glossary or system-status context; keep in a reachable named destination.

The JSON records every matched key/source and each catalog field. Catalog help is Bi data rather than translation-key data. Its format, unit, privacy/access and Unknown state metadata remain inline even if what/why/example move to contextual Help. Deen why includes the no-comparison/no-scripture note and is classified MustVisible.

## Diagram opportunities

Prefer existing accessible plan-flow, goal-tree, backward-plan and board diagrams where these already explain a relationship. Preserve equivalent text. A help panel may reuse those semantics but must not invent task order, progress totals, scripture or financial forecasts.
