# Reliability fixes and UI design selection — 5 Nov 2026

Branch: `fix/recovery-offline-install`, based on audit commit `83916d3`. This is a follow-up to the [baseline audit](REPOSITORY_AUDIT_2026-11-05.md), prepared as a separate review PR. Changes are not yet deployed.

## Fixed application paths

- **AUD-01 — restore failure.** Compensation covers every affected namespace, including the part whose write failed, and verifies the recovered records. Persistent storage/rollback failure produces a typed uncertain-recovery result instead of “nothing was changed”. The retained Before restore copy remains reachable through Go back. Failed Go back keeps the original recovery action instead of claiming the copy disappeared.
- **AUD-03 — cross-namespace Go back.** Recovery now uses the same protected restore operation, saves the current state first, and compensates both parts if the later part fails. Real-data recovery requires the current consent tick; it cannot silently overwrite only demo data and report success.
- **Durable-save integration.** The restore UI awaits its IndexedDB/local-storage persistence queue before success. Failed writes/deletes are monitored and recovery can retry them. Retries use the latest desired value, including deletion, rather than a stale failed value. No schema or IndexedDB-version migration is needed.
- **AUD-02 — interrupted offline update.** A required precache failure rejects service-worker installation. The previous active worker/cache remains available; the same deployment can retry after the download succeeds. Worker-source changes also contribute to shell-cache versioning. Browser tests exercise an actual local-server 503 followed by success, user-approved activation and offline reload.

These are compensated writes, not a new database-wide transaction guarantee. If the device cannot write during both replacement and recovery, a partial state can remain; the UI now reports uncertainty and retains the recovery copy rather than claiming success or unchanged data. Closing the browser during recovery and actual storage-device failures still need physical-device acceptance. No real owner data was used by these tests.

## Deployment gate prepared, activation still owed

OPS-01 / AUD-10 has a tested `npm run build:verified` command. It blocks unless GitHub's production `ci.yml` push run and its current `check` job succeeded for the exact checkout commit. It fails closed on missing/failed/skipped/unrelated checks or API/network errors. See [configuration and tradeoffs](../deployment/CI_GATE.md).

Cloudflare's remote command is still `npm run build`. Activation must follow review/merge of the script and verification of the exact proposed setting. No account, token, DNS, trigger, branch or production deployment was changed. The tracker therefore leaves OPS-01 at Needs verification.

## Two-agent UI decision

Independent proposals [A](../design/UI_REFRESH_2026-11-05_A.md) and [B](../design/UI_REFRESH_2026-11-05_B.md) were exchanged, challenged and revised. Both agents reviewed and selected [Action Desk](../design/UI_REFRESH_2026-11-05_DECISION.md): retain purple Light Futuristic and all four saved looks, put today's actual tasks/goals before broad summaries, retain stage context, and group all 18 Journey tools. The decision includes exact builder/route mapping and mobile/accessibility acceptance. UI design selection is complete; runtime visual implementation is a separate pending package, not claimed here.

## Validation

<!-- final-validation -->
| Check | Final result |
|---|---|
| `npm run typecheck` | Passed |
| `npm test` | **1,976 passed, 0 failed, 162 files**, 194.17 seconds, Node 24.22.1. New recovery/persistence/SW/deployment regression cases included. |
| `npm run build` | Passed; existing 541.60 kB hadith chunk warning remains PERF-01 work |
| Real Chromium browser/offline suite | **92 passed, 0 failed**, including interrupted required download, old-version offline use and successful same-deployment retry |
| Focused persistence/restore suite | 68 passed; final persistence/UI-only rerun 12 passed |
| Deployment gate cases | 19 passed; remote activation is not claimed |
| Existing UI/Bangla regression rerun | 54 passed after intentionally updating the added recovery-string count and waiting for durable completion rather than memory count |
| Plan/link integrity | 29 packages, 213 archived task IDs + 20 reminder/gap references, four unchanged archive hashes, no dependency cycles; maintained local links pass |
| Independent core review | Persistence agent read the parent's recovery/restore/UI changes without modifying them; no actionable regression found. |

Initial full runs exposed the intentional string-count change and an old UI test that read the result before durable saving finished. Both test contracts were corrected, then the entire final suite passed. Application runtime source and test files were unchanged during the successful final full run; subsequent edits record the results and extend documentation-link checking.

[Machine-readable verification evidence](evidence/2026-11-05-reliability.json) includes the Chromium check results. [Short Bangla summary](../owner/RELIABILITY_UI_2026-11-05_BN.md).
<!-- /final-validation -->

No original Register workbook was changed or human gate promoted to Verified. The original audit's observed bugs remain historical evidence; current task status lives in [PLAN_TRACKER](../plan/PLAN_TRACKER.md).
