# Contextual-help audit evidence — 6 November 2026

All browser inputs are synthetic. These are desktop Chromium checks at phone viewport sizes, not physical Android or TalkBack acceptance. Runtime captures use the implementation working-tree build derived from tracked1a07140; that build was produced before the UI source commit b36c22c. A build stamp alone does not identify the earlier uncommitted UI snapshot or establish a production deployment.

## Coverage

| Phase | Coverage | Result |
|---|---|---|
| Baseline f3c7604 |57route patterns,34Settings rows,12guides,186catalog fields; EN/BN;215frames | Every baseline route pattern covered; two extra Deen alias probes redirect because those aliases did not yet exist. |
| Implementation |59route patterns,38Settings rows,12guides,186catalog fields; EN/BN;227frames | No blocked destination or horizontal overflow. |
| Preference interactions | All16 combinations;164assertions | All pass: one overlay, Back/focus/drafts, map privacy/read-only behavior and durable prayer mark/undo/reload. |
| Visual matrix |8surfaces ×4looks ×75/150/200% =96geometry checks | All pass; includes dark150%. |
| Additional dark overlays |4looks ×100/200% ×Help/Deen menu =16checks | All pass; contrast surfaces inspected. |
| Final release frames |13refreshed frames, including Deen, Profile, Journey, Diary and Settings | No blocked destination or horizontal overflow. |
| Final Settings fold | Populated demo EN/BN/Mix at360×740 | All pass: Quick card bottom682.6875 ≤ navigation top683. |
| Real Settings fold | Empty real EN/BN/Mix at360×740 | All pass. |

## Files and phase ordering

- [Classification ledger](CLASSIFICATION_LEDGER.md) and [source inventory](classification-ledger.json) distinguish MustVisible, BriefInline, OptionalHelp and Reference.
- [Baseline coverage](baseline/coverage.json), [implementation coverage](implementation/coverage.json) and their reports record every checked address.
- [Artifact manifest](artifact-manifest.json) maps each capture to a saved contact-sheet cell or representative viewport. Explicit `/tmp` raw paths are workspace-only originals, not tracked files. Contact sheets retain the complete route inventory; representative phone frames are saved separately.
- [Preference report](preferences/report.json) and its contact sheet retain164functional results and16frames.
- [Visual matrix report](final-visuals/report.json) retains96successful matrix results plus the three initially failed populated-demo fold checks. These failures are historical and intentionally retained.
- [Initial demo fold](demo-fold-before-fix/report.json) reproduces that regression. [Final release report](release/report.json) supersedes it after shorter redundant Settings prose and tighter card spacing preserved the44px controls.
- [Real fold report](real-fold/report.json) records the separate real-mode fixture. [Dark overlay report](dark-overlays/report.json) adds16successful checks.

The initial invalid preference probe used an incorrect field fixture ID and was discarded; the recorded run uses `profile.display_name`. No product failure is inferred from that probe. Broadsheet at200% can wrap the compact Demo badge text; all text remains available and geometry checks pass.

## Limits

These artifacts verify layout geometry and specific interactions, not every screen-reader announcement, every content claim or human usability. Physical phone, TalkBack, Bangla reviewer and official prayer-timetable comparison remain tracked separately. Production release and exact-SHA deployment receipts belong in the parent implementation report.
