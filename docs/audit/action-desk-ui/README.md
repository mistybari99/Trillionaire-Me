# Action Desk browser evidence

Fresh browser captures taken on 2026-11-05 against the local Vite production preview, using only synthetic records. This is browser evidence; no physical device/TalkBack review is claimed.

`baseline32bc54b/` contains a fresh baseline of production source 32bc54b before UI work (Today/Journey, English/Bangla, 100%/200%, 360×800). It reuses the synthetic goal/task fixture from tools/screenshots.mjs. That original fixture has unknown capacity/task minutes, so it does not represent a populated daily schedule.

`after/` records the first implementation pass. Its populated synthetic fixture adds task minutes and a saved time window so the actual scheduler emits task rows. The first-pass capture found truncated task goal names and a misleading Demo data shell badge in real mode; engineering fixes were requested. Final verification follows below.

For each phase, report.json contains measured geometry and original screenshot paths. Full lossless screenshots remain in `/tmp/action-desk-ui-evidence/`; repository images are compact JPEG representatives and contact sheets. The full captures are reproducible with:

```sh
npm run build
PLAYWRIGHT_BROWSERS_PATH=/tmp/tm-pw-browsers TM_ACTION_PHASE=after-final node tools/action_desk_qa.mjs
```

The harness defaults to `/tmp/action-desk-ui-evidence/<phase>`; `TM_ACTION_OUT` overrides the output directory. Synthetic state probes cover empty real storage with synthetic device consent, consent paused, unknown capacity, actual browser offline events, rejected local record writes, a waiting worker registration rendered through the real updater, and Mix language. They do not mutate production or the built service worker. The save-error probe deliberately disables IndexedDB and rejects localStorage record writes to exercise the supported local-storage fallback.

Limits: screenshot/DOM checks do not establish screen-reader behavior or a comprehensive contrast audit. Device safe-area behavior must still be checked on physical hardware. Demo UI dates are fixture dates, not a claim about the capture clock.

## Final result

After the first-pass findings were fixed, `after-final/` captures the final rebuilt source: 64 Today/Journey look, language, theme and scale frames, 8 goal-detail frames and 28 state frames. `after-stress/` adds 4 long Bangla goal-title frames on Today and goal detail. All 104 completed without horizontal overflow or a recorded geometry violation.

- The populated Today fixture preserves planner order `shot-t2`, `shot-t3` and renders exactly one selected next-action surface. At LF English 100%, the first task begins at 451px; its Done/Focus controls appear above the 743px navigation boundary.
- All 5 navigation labels remain visible. Navigation height measures 57px at 100% and 130.59px at Bangla 200%; the rendered updater banner clears the navigation by 12px. The last measured main control remains reachable above the bar after scrolling.
- Tested buttons, button-styled links, selects and non-checkbox inputs meet the 44px target floor. Goal chips now show the full goal name and wrap on long Bangla text; no title ellipsis remains in those changed surfaces.
- Empty real mode has no seeded demo goals/tasks and shows the localized Only real badge. Unknown capacity renders no invented scheduled task. Actual offline events leave Today/Journey locally reachable and show offline connectivity.
- The rejected-write probe preserves the visible save-failed recovery banner above the Today heading. The consent-paused warning stays above Today content. A waiting worker registration renders the real update component without changing dist/sw.js.
- Goal detail shows title/status before progress and linked steps. Existing unknown-aware progress and goal editing remain available.

Visual inspection covered representative English/Bangla 100/200 views, all 4 looks in light/dark through contact sheets, bottom clearance, empty real, consent paused, rejected writes and the update banner. Full screenshots/JSON support the broader matrix. The 100-frame capture preceded a final small change removing the repeated empty-real Start work setup link; the superseding delta is recorded below.

To rerun only the long-title stress probe:

```sh
PLAYWRIGHT_BROWSERS_PATH=/tmp/tm-pw-browsers TM_ACTION_PHASE=after-stress TM_ACTION_STATES_ONLY=1 TM_ACTION_STATES=long-title node tools/action_desk_qa.mjs
```

The current harness includes long-title probes by default on future runs (104 total). The first final run predates that addition and is preserved as 100 screens plus the separate 4-screen stress report. First-pass `after/report.json` explicitly marks the initial save-failure Today capture that was actually on the completion/reward screen; the final probe returns to Today before capturing.


## Empty-real setup delta and keyboard probe

The final small empty-real change removes the repeated Start work setup entry while retaining the next-action Open Diary button. `after-empty-en/` and `after-empty-bn/` supersede the older empty-real screenshots for this change: fresh English/Bangla 100%/200% Today views show no fabricated task/demo fallback or horizontal overflow. The localized Only real badge remains correct. The English delta report also records the remaining entry action.

A fresh sequential keyboard probe reaches both actual task Done/Focus pairs and all 18 grouped Journey tool links. The initial probe found Enter on Skip to content returned focus to BODY after the hash router normalized `#content` back to `#/today`; that failed result remains recorded in `after-empty-en/keyboard.json`. Engineering repaired the skip link to focus main directly. A rebuilt keyboard-only retest in `after-keyboard/keyboard.json` passes: first Tab reaches Skip to content, Enter focuses MAIN#content while preserving the Today route, both actual task Done/Focus pairs and all 18 Journey tool links are sequentially reachable. No TalkBack result is inferred.


Keyboard-only reproduction (after building):

```sh
PLAYWRIGHT_BROWSERS_PATH=/tmp/tm-pw-browsers TM_ACTION_PHASE=after-keyboard TM_ACTION_KEYBOARD_ONLY=1 TM_ACTION_KEYBOARD=1 node tools/action_desk_qa.mjs
```

The four empty-real delta screenshots bring the completed browser capture count to 108; the keyboard-only rerun records focus/Tab results without extra screenshots. The broader 100-frame matrix was not repeated for these two localized follow-up fixes.
