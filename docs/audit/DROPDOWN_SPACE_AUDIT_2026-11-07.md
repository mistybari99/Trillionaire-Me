# Dropdown and compact-control audit — 7 November 2026

Recovery note (8 November 2026): this read-only proposal was recovered from the attached pending-work audit. It describes the older `fba100d` baseline. No dropdown conversion is part of the Text Size Lock integration; every proposal must be rechecked against the current route before implementation.

Two independent read-only reviews inventoried screen constructors, native selects, segmented groups and disclosures, then inspected representative 360×800 layouts at 150% text in English, Bangla and Mix.

## Joint recommendations

| Priority | Route and control | Current presentation on audited baseline | Recommended compact pattern | Risk and required safeguard |
|---|---|---|---|---|
| High | `#/hadith` topic filter (`src/ui/hadithUi.ts`) | 10 wrapping topic buttons | Labelled native select with All topics | Keep the current topic visible and preserve clear-filter behavior. |
| High | `#/journey/wheel` area values (`src/ui/lifeUi.ts`) | Six buttons per area | One labelled select per area: Unknown, 1–5 | Unknown must never become 0; prototype before release. |
| High | Settings → Plan → Stage names (`src/ui/planSettings.ts`) | Three long buttons | Labelled native select | Keep the explanatory note and announce the changed template. |
| Consider | `#/habits` chart range (`src/ui/charts.ts`) | 31 days / 12 weeks / 12 months buttons | Labelled native select | One extra tap on a sometimes-frequent filter; usability-test first. |
| Consider | Settings → Plan mode (`src/ui/planSettings.ts`) | Normal / Minimum week / Pause buttons | Select plus active-mode description | Consequential planning change; visible choices may remain safer. |
| Consider | Goal SMART/SWOT editors (`src/ui/lifeUi.ts`) | Long editor cards remain open | Native disclosures with status summaries | Never hide errors or unsaved text; keep a read-only summary visible. |
| Consider | Settings → Automation rules (`src/ui/planSettings.ts`) | Long list of binary rows | One disclosure with changed-count summary | Name every non-default rule in the summary. |
| Consider | Look → Design chooser (`src/ui/lookUi.ts`) | Visual cards with swatches and descriptions | Disclosure around the existing cards | Do not replace visual comparison with a select. |

## Keep visible

- Language and Theme: first-fold accessibility and recovery choices.
- Focus durations and bottom-tab quick tools: frequent primary actions.
- Prayer marks and prayer selections: daily one-tap actions or true multi-select.
- Habit weekdays and day marks: true multi-select/direct logging.
- Detailed/Compact, Map/List and other immediate visual comparisons.
- Data mode, consent, privacy, delete, restore and reset confirmations.
- Azan recording rows: availability, choice and preview belong together.
- Design cards: visual previews matter; only the containing section may collapse.

## Decision

The proposed later order is Hadith topic filter, Life Wheel values, then Stage template. Habit range and Plan mode require a small phone comparison first. A dropdown is suitable only for an infrequent, mutually exclusive group with three or more options when the selected value stays visible. It must not replace a primary action, binary switch, multi-select, prayer quick action, safety confirmation or visual comparison.

Physical Android/TalkBack review remains open. This audit introduces no schema, record, calculation, route or deployment change.
