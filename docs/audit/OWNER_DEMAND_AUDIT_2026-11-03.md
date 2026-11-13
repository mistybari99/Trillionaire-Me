# Owner-demand audit: summary re-run, 3 Nov 2026

Source table: `docs/design/owner-demand-audit.md` (132 rows, sections 1 to 3; the 5 rows that moved are listed in its section 6). Rule for status: DONE = reachable from a screen and covered by a test; PARTIAL = part is built; MISSING = no reachable code, or it waits for the owner (D-B, D-C, D-D, G8, owner-only tasks). A test (`tests/audit_counts.test.ts`) recounts the table and fails if this page and the table disagree.

| Status | 25 Oct | 31 Oct | 1 Nov (Block 8) | 3 Nov |
|---|---|---|---|---|
| DONE | 25 | 34 | 34 | 35 |
| PARTIAL | 46 | 47 | 53 | 57 |
| MISSING | 61 | 51 | 45 | 40 |

Completion by the same simple measure as the first audit (DONE plus half of PARTIAL, over 132 rows): 25 Oct 36 percent, 31 Oct 44 percent, 1 Nov 46 percent, 3 Nov 48 percent. This counts only the owner-demand list; it is not a statement about the whole product or about quality.

## What moved since 1 Nov
- Rows that moved status: 5 (see section 6 of the table file).
- Built since the 1 Nov re-check and counted in the module card, not as separate rows: KPI targets, venture value, reality-changed loop, North Star values, team hand-over, risk review dates, goal tree, PDF through the print window, stage rules, monthly review, yearly and one-off money lines, time blocks, path sources and weights, notes and SOPs, profile read-back, way-of-working questions, boards (timeline, task board, option board), Hijri date and Ramadan view, welcome back and then-vs-now, automatic prayer times (off until ticked), Settings redesign, hosting headers, CI.
- Modules (m-list): 22 complete, 2 partial (M09 unit economics, M21 at-rest encryption), 1 blocked (M23 AI) of 25. M18 became complete later on 3 Nov: drawn goal tree, resource map, readiness map and plan-change board are on `#/journey/boards`.

## What the 40 MISSING rows are made of
- Owner-only or waiting for an approval (about 12): phone offline test, Bangla review, usability sessions, hosting account, AI coaches (D-C), Google search (D-C), sharing, ambient sound, home-screen widget, scripture text (D-D).
- Visual patterns from the reference batches that are not built (about 28): challenge tracker, working-style chooser, Want-Feel-Do card, micro-habit starter, focus card grid, maturity funnel, momentum shape, courage bridge, change rings, setback curve, mindset stair, reward choice, backward-planning wizard, deadline breakdown, clarity 2x2, thinking-mode picker, subject rings, success gauge and similar. None of them need an approval; they are builder work in the order of the table.

## Not changed by this run
Status words for owner-only tasks stay MISSING until the owner does them. Nothing here was marked done on a hunch: each moved row names the file and test that cover it.
