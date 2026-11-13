# Live Calculator / What-if (LIVECALC-01)

Status: built, waiting for the Audit agent. Tracker row: [LIVECALC-01](../plan/PLAN_TRACKER.md).

## What it is
A calculator that opens from the top bar on every screen (calculator icon, `data-act="whatif-open"`) and as full pages at `#/whatif` (all calculators) and `#/whatif/<calculator>`.
Change one number and see what follows. Example: 10 pages a day at 3 minutes a page is 30 minutes a day; 20 days is 200 pages; at 2 minutes a page, 30 minutes gives 15 pages a day and 300 pages in 20 days.

## Rules
- Blank = Unknown, never 0. Any ONE field can be the unknown ("Find out" menu). A figure exists only when every needed number is typed. Division by zero, negative where not allowed, and numbers above 1 trillion are Unknown / flagged.
- Latin and Bangla digits are accepted on input; output is always Latin digits.
- Every figure is labelled ESTIMATE. No shipped rates, thresholds, bank rates or defaults. Tax choices 10% / 15% are the owner's two options; nothing is pre-selected.
- FDR calculator: simple interest, tax on the interest only, optional yearly excise amount typed by the person (otherwise "excise duty is not included"). Tenure 0 months gives a total of 0.
- Notes are honest and motivating: no promise, no guarantee, no shame, no streak or score. Tone follows the category.
- Compare mode: "Now" against "What if" with the change and the percent change (percent only when the base is not 0). Bars are SVG with a text alternative; no chart library.
- Save: only "Save as note" (a normal `note` record: title + text). No new record type, no schema change, results cannot be saved as goals in v1.

## Files
| Part | File |
|---|---|
| Engine (templates, parser, solve-for, compare) | `src/core/whatif.ts` |
| Calculators per category (config only) and notes | `src/core/whatifCatalog.ts` |
| Prefill from the current screen | `src/core/whatifPrefill.ts` |
| UI panel, screens, sheet, top-bar button | `src/ui/whatifUi.ts`, `src/ui/styles_whatif.css` |
| Routes | `src/ui/routes_whatif.ts` (one spread line in `src/app.ts`) |
| Text (EN/BN/Mix) | `src/i18n/q_whatif.ts` |
| Tests | `tests/whatif_engine.test.ts`, `tests/whatif_ui.test.ts`, `tests/whatif_screens.test.ts` |
| Screen evidence | `evidence/whatif-screens-2026-11-13.json` |

## Templates (generic) and categories
Generic: rate x time, total per period, required per period, time to finish (rounded up), percent, percent change, compound + recurring (DPS), compare A/B, budget, EMI.
Also: payoff (early loan payoff), gap closer (no-shame), zakat-style percent (uses `zakatFigure` with the person's own wealth, nisab and rate; no ruling), FDR, and the shared library formulas (break-even, margin, CAC, payback, capacity).
Categories (47 calculators): Reading, Time and speed, Habits, Goals, Money, Business, Health, Deen, Work blocks, Compare A and B.

## Prefill (only real catalog fields, active mode, consent respected)
| Screen | Calculator | Fields read |
|---|---|---|
| Habits | h-time | habit.minutes, habit.days_per_week |
| Today, Plan, Focus | t-finish | task.minutes, task.done_on |
| Plan | w-blocks | work_block.date/from/to |
| Goals, North Star, KPI | g-gap | north_star.target, north_star.current |
| Money | m-budget | finance.kind/scope/amount/period (personal, monthly) |
| Ventures, Team | m-breakeven | venture.sector_inputs |
| Health | hl-steps, hl-water | health_entry.kind/value/date (health consent) |
| Deen, Plans | d-zakat | zakat_snapshot.wealth/nisab/rate |

## Not in v1
Saving a result as a goal or task; chart library; any network call or AI.
