# UI kit reconcile plan: Action Desk merge (6 Nov 2026)

Status: PLAN ONLY. Nothing pushed. Local branch holds two commits: "WIP UI polish kit K0-K2" and a merge of origin/ccr-8b686ba2-vitt45 (conflicts: goalLinks.ts took theirs; styles.css merged by hand, our old "one vertical rhythm" block dropped). After the merge: tsc clean, vitest 2010/2010 pass, build ok. e2e had 4 FAIL lines on first run (being root-caused before any push).

## 1. What the merged commits changed
| Commit | What | Files (UI-relevant) |
|---|---|---|
| 5f11158 Action Desk + task-first nav | Today and Journey become an "Action Desk": header card, quick tools grid, recommended task, agenda; nav layout helper; header mode | app.ts, navLayout.ts, homeUi.ts, lifeUi.ts, screens.ts (today, journey), goalLinks.ts, styles.css (+60 rules `.action-desk*`, `.journey-*`, `.tool-grid`), tests action_desk_*, nav_layout, header_mode, a11y_looks, tools/action_desk_qa.mjs |
| 082c2c7 recovery + offline install | Durable restore, SW precache fix, deploy gate | core/backup, persist, restore, snapshots, store, restoreUi.ts, state.ts, public/sw.js, tools/check_deploy.mjs, tests. No styling. |
| 2d73b53 shortcuts + multi-goal picker | Independent goal checkboxes (`.choice-row`, `.goal-pick-group`, `.field-choices`), workspace shortcuts, shared control family CSS | fieldInput.ts (new), goalLinks.ts, screens.ts, charts.ts, styles.css (+47), packs.ts |
| e8c268d text-size slider 75-150% | Settings range input, `.text-size-*` CSS, root font-size set continuously | settingsUi.ts, state.ts, styles.css, tests text_size, settings_shell, tools/e2e.mjs |
| 03eecb8 collapsed feature details | Module descriptions inside closed `<details class="module-details">` | capabilityUi.ts, screens.ts, styles.css, tests module_details |
| 83916d3 audit/tracking docs | Plan/TODO/Tracker consolidation, check_plan | docs, tools/check_plan.mjs, CI. No UI. |

## 2. Overlaps with our kit
1. Spacing/components: Action Desk CSS uses raw px and its own card/header/agenda surfaces; its "shared control family" block uses `!important` (`main :is(.row,.btn-row,.snap-btns)>.btn{flex:1 1 8rem;min-height:52px!important;margin-top:0!important}`) and sets `.btn.ghost` border 1px. Our kit.css loads later but loses to their higher-specificity/!important rules: result is mixed looks (e.g. Detailed/Compact seg vs our seg, fit-content ghost buttons).
2. Rem scaling vs slider: slider changes root font-size continuously, so rem tokens (`--fs-*`, min-height in rem) scale with it. Our px tokens (`--s*`, 44/48px control heights, 24px checkbox) do not; that is intended (targets stay >= 44px) but wrapping must be checked at 150% and at the old 200% matrix. Nothing in kit depends on font-size being 100%.
3. Nav: they own navLayout.ts and header mode; our nav restyle (tab pill, safe-area) touches the same `nav`/`.tab` selectors. Keep their structure, our CSS only adds colour/radius.
4. Disclaimers once per route: their new Action Desk screens call `disclaimers()` too; our `resetNotices()` in render() dedupes by key. Their lazy/other renders must not bypass it. A test will assert it.
5. Checkboxes: their `.choice-row input[type=checkbox]` (24px, accent-color) plus our drawn `appearance:none` box. Both set 24px; need one rule (ours) and keep `.choice-row` layout.
6. Bangla plain: no copy changed by us; their packs.ts additions must be checked against bangla-plain-final-decision.md and pass 2 (existing bangla_plain tests pass).
7. Looks matrix: Action Desk replaced glass cards in Light Futuristic (`.action-desk .card{backdrop-filter:none}`); the matrix route list must add action-desk states; their tools/action_desk_qa.mjs overlaps our checks.
8. `valueEl` chip, `.stage`, `.next-step`, `.inspire` styles are partly overridden by `.action-desk` rules.

## 3. Reconcile steps (each: tsc, vitest, build, e2e, matrix problems 0, then picture review)
R0 Fix the 4 e2e FAIL lines on the merged head (selector/class assumptions); no push yet. Test: tools/e2e.mjs all PASS.
R1 Move Action Desk, control-family and shortcut CSS into kit.css terms: replace px with tokens, remove `!important` (use `:where()` + container gap), keep every class name and data attribute. Tests: action_desk_*, nav_layout, header_mode, a11y_looks, new "no adjacent controls under 8px".
R2 One checkbox/choice-row rule; `.choice-row` rows become k-row-like. Tests: goal picker tests, multi-select tests, tap target >= 44.
R3 Text-size: add test at 75/100/150/200 that nothing overflows and controls stay >= 44px; verify slider range input styled by kit (kit already sets range).
R4 Disclaimers once per route test over every route in EN and BN; chip-placement test (exempt `.val`).
R5 Continue spec K3 (Group A screens, converting Action Desk markup to kit builders), K4 prose/tables, K5 settings, K6 cleanup (delete `.scr-*` repairs and old aliases).
R6 Looks matrix: add the ~15 routes plus Action Desk states; 4 looks x EN/BN x light/dark x 100/200% = 0 problems; open the sheets and fix what is seen.
R7 Docs: DECISIONS_LOG, PLAN_TRACKER (new format from 83916d3, run tools/check_plan.mjs), TODO, m-list status.

## 4. Risks
- Their e2e/test files assert classes and text; restyle by adding classes, never renaming (spec risk 1).
- Removing `!important` can reorder the cascade; guard with the matrix and a screenshot check of Today/Journey in all looks.
- Their plan docs now have a checker (check_plan.mjs, CI): editing PLAN_TRACKER wrongly turns CI red.
- Recovery/offline commits touch state.ts and sw.js: we do not edit them; kit adds only CSS and class names, so precache list must still pass deployment_gate test (kit.css is bundled by vite, no new asset path).
- Large evidence churn from the matrix: commit only deliverable evidence.
