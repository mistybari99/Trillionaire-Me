# Looks evidence: 4 looks, English and Bangla, light and dark, 100 % and 200 % text (3 Nov 2026)

Owner order 3 Nov 2026 (plan keeper G3-04): open the matrix pictures, fix real layout problems, give every "Built" row a looks reference.

## What was run
- Tool: `TM_SHOT_MATRIX=1 node tools/screenshots.mjs` (one look per process with `TM_SHOT_ONLY_DESIGN`, then `TM_SHOT_MATRIX_MERGE=1`), 360 x 740 px.
- Matrix: 4 looks (Light Futuristic, Ink & Paper, Emerald Obsidian, Classic) x English / Bangla x light / dark x 100 % / 200 % text x **28 screens** = 896 pictures. The 200 % case sets the root font size, as the e2e check does.
- Screens: Today, Journey, goal page, monthly review, Deen, Settings home and 11 Settings pages (prayer, privacy, backup, restore, look, data, start real, plan, connections, delete, about), Plan, Boards, Plan backwards, Where we are, Risks, Team, Ventures, Money, Habits, Goals, Capability status.
- Report: `evidence/matrix-report.json` (896 screens, 0 problems after the fixes below). Test: `tests/looks_matrix.test.ts` fails if the report lists any problem, is incomplete, or a contact sheet is missing.
- Contact sheets (kept in the repository): `evidence/looks-sheets/<look>-<screen>.jpg`, 8 tiles each (top row 100 % text, bottom row 200 %; English light, English dark, Bangla light, Bangla dark). Full-page pictures of the Boards page with the new drawings: `evidence/looks-sheets/boards-fullpage-*.jpg`. Tool: `tools/looks_sheets.py`.
- Mix mode is Bangla text with English words swapped in; it has no layout of its own, so it is covered by the copy and i18n tests, not by pictures.

## What was looked at, and what was only measured
- Opened and read by the builder (images viewed): Today (Light Futuristic, Emerald Obsidian, Ink & Paper via the tab fix), Settings home (Ink & Paper, Light Futuristic), Settings Look, Data, Plan, Privacy, Backup, Monthly review, Goal page, Plan (diary), Plan backwards (Classic), Boards full page (Light Futuristic English, Bangla dark and 200 % text, Ink & Paper dark, Emerald Obsidian, Classic Bangla), and the bottom bar at 200 % in English and Bangla after the final fix.
- The other sheets were not opened one by one. For them the evidence is the automatic report (page overflow, element wider than the screen, tap targets under 44 px, tab labels outside the screen or broken across lines), which was 0 problems on the final run.
- The old report said "0 problems" while three real faults were on screen, because it measured width and tap size only. The tab-label check was added to the report for that reason.

## Faults found by looking, and fixed
| # | Fault | Where | Fix | Guard |
|---|---|---|---|---|
| 1 | At 200 % text the bottom tab labels broke inside a word ("Journ / ey", "Settin / gs", "Toda / y") | every screen, all looks, English and Bangla | tab labels keep every word whole and still grow with the text size; when they no longer fit in one row the bar wraps into two rows (English at 200 %) | matrix report fails if a tab label breaks across lines; `tests/a11y_looks.test.ts`; e2e TEXTSIZE |
| 2 | Ghost buttons ("Start real now" banner and every other secondary button) were drawn on the indigo gradient with ink-coloured text, about 2:1 contrast, light and dark | Light Futuristic (the default look) | the gradient skips `.btn.ghost` | `tests/a11y_looks.test.ts` |
| 3 | Plain links showed the browser's default blue, unreadable on the dark card | Settings status lines, Privacy page, all looks in dark mode | links with no class use the primary token (4.5:1 checked in all looks) | `tests/a11y_looks.test.ts` |
| 4 | "Automatic" in the Quick card broke as "Automati / c" | Settings home | segmented buttons keep a word whole and the row wraps | e2e SET-200, matrix |
| 5 | A long tag ("Internet only after a tap; the result is saved here") pushed the Capability status page wider than the screen at 200 % text | Capability status, three looks | tags may wrap | matrix report (4 problems before, 0 after) |
| 6 | New Boards drawings first drawn with labels over lines and a clipped column title | Boards (resource map, readiness map) | tile layout without crossing lines, two-line column titles, text halo | `tests/maps.test.ts`, full-page pictures |

## Still not covered
- Pages outside the 28 screens (start, topics, hadith, halal flags, weekly review, decide, mine, legs, leak, notes and others) have no 4-look pictures. Their tracker rows say "not in matrix".
- The pictures are made in a desktop Chromium at 360 px width. A real phone check stays an owner task (TODO Part B).
- Timeline labels on the Boards page can touch the dashed "today" line (the text now has a halo so it stays readable; the layout is unchanged).

## Re-run after Bangla pass 2 (3 Nov 2026)
`TM_SHOT_MATRIX=1` over the four looks (one process per look), then `TM_SHOT_MATRIX_MERGE=1`: **896 screens, 0 problems** (page overflow, wide elements, targets under 44 px, tab labels, touching neighbours), including every Bangla screen with the new shorter button texts. Report: `evidence/matrix-report.json`.
