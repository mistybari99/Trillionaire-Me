# Repository audit — 5 Nov 2026

Audited application commit: `6136ba861c85ad1630af2443e56d422a6a8a0276` on `ccr-8b686ba2-vitt45`. Audit/organization branch: `audit/repository-organization-2026-11-05`. Evidence is for this commit, not a promise about subsequent changes.

## Result and limits

The app builds and its happy-path browser checks work, but recovery and interrupted offline-install failure paths have reproducible gaps. Work records also disagree with the code and hosting. Address AUD-01 and AUD-02 before claiming reliable recovery/offline updates. No overall completion percentage is assigned: module build boxes, owner-demand counts, automated tests and human acceptance measure different things.

Reviewed: canonical spec, handoff, original Register requirements/gates/decisions, current charter and decision log, source and tests for consent, persistence, restore, prayer requests and service-worker updates, planning/audit documents, all three remote branches, open PRs, recent CI and Cloudflare build/deployment metadata. This is a focused engineering and work-organization audit, not an exhaustive security assessment or verification of every feature. No real owner data, physical phone, live prayer provider, private design prototype or new 896-image visual inspection was used.

## Findings, in execution order

| ID | Priority | Evidence and impact | Follow-up acceptance |
|---|---|---|---|
| AUD-01 | P1 | `src/core/restore.ts` catches failed replacement/rollback and appends “nothing was changed”; `src/ui/restoreUi.ts` and `restore.failed` repeat the reassurance. Injecting a persistent write failure leaves `old,new` instead of `old`, while the error says nothing changed. A Before restore snapshot survives, but the failure result offers no Go back ID. Current tests simulate one failed put, not failed rollback. | Distinguish rollback failure from successful rollback; expose retained recovery copy; test persistent failure and mixed-namespace restoration with durable storage. Never claim unchanged data without checking it. |
| AUD-02 | P1 | `public/sw.js` install uses `Promise.allSettled` without checking rejected required files. Simulating a missing required JS file lets install fulfill; activation deletes `tm-shell-old`. An interrupted install/update can replace a complete cache with an incomplete one. Existing tests even assert the allSettled source pattern. | Reject incomplete required precache; preserve the working version on failed update; browser-test a failed asset download, retry and offline reload. Keep genuine optional assets optional explicitly. |
| AUD-03 | P1 | `src/core/snapshots.ts#restoreSnapshot` restores demo then real independently. `goBack` calls it directly; a later namespace failure cannot roll back the first namespace. This path is visible from code; the persistent-failure reproduction directly covers AUD-01 only. | Reproduce cross-namespace Go back failure, then provide transaction/recovery handling with honest UI results and failure tests. |
| AUD-10 | P1 | Cloudflare builds run `npm run build` then deploy, while GitHub CI tests/e2e run independently on push. The inspected trigger has no test command or CI-success dependency. A successful deployment therefore does not establish that validation passed first. | OPS-01: prepare a reviewed validation gate before deployment, retain the branch and account, and test that a failed required check prevents deployment. |
| AUD-04 | P2 | Tracker introduction says CI/headers/settings are missing; section F says Settings routes are unbuilt. These exist in source and tests. README says no runtime network while Wikipedia and opt-in Aladhan are supported. Hosting is described as pending despite a working Worker build. The historical override-core entry also points to a file removed as dead code in commit `244d6f8`; the active BUILD-01 does not claim that core still exists. | Organization changes in this PR: one active tracker, short next queue, roadmap by phase, dated audit, historical archives and explicit evidence limits. |
| AUD-05 | P2 | PR #1 targets initial-only `main` and contains 249 commits / 867 changed files, but its title/body still describe the first 39-test, demo-only G1 shell. PR #2 has 61 commits / 243 files relative to `main`, although only 2 commits diverge from the live app branch; it is not just a design-file diff against `main`. | Review PR #1 against actual delivered scope; reconcile PR #2's unique design material against current requirements in a small follow-up PR. Do not merge either automatically. |
| AUD-06 | P2 | PR #2's unique design document confirms Ink & Paper as the default and says capability status is missing; current charter/default is Light Futuristic and M22 exists. It changes decision/roadmap files and generated `evidence/catalog-report.json` too. | Preserve design intent but correct outdated claims, identify proposals versus approvals, exclude routine evidence churn, and validate any imported doc against current source. |
| AUD-07 | P2 | `npm run build` warns about a 541.60 kB minified hadith chunk (108.99 kB gzip); main chunk is 477.72 kB. README's old “no chunk over 500 kB” claim in historical work records no longer describes this build. Precache includes 62 URLs. | Measure compressed cold install/offline cost on a phone; prioritize reducing content payload without removing offline availability or enabling unreviewed content. |
| AUD-08 | P2 | `tests/looks_matrix.test.ts` validates a committed historical report and file existence; that does not rerender or inspect today's UI. Tracker has explicit pages outside the matrix. | Fresh checks for onboarding, topics, halal flags, weekly review, decide/mine/legs/leak, Universe and language control at 360 px, BN/EN/Mix, dark and 200% text; open images, record findings. |
| AUD-09 | P2 | Phone offline/lock-screen/reminder tests, Bangla sign-off, official prayer-time comparison and usability sessions remain unverified. CI cannot grant these human gates. Prayer sync tests mock the provider. | Keep owner/reviewer work distinct from builder work; record dated device/reviewer evidence before changing acceptance status. |

P0 = confirmed urgent data exposure/loss; P1 = high-impact recovery/reliability risk; P2 = correctness, validation or maintainability; P3 = optional polish. No confirmed production P0 incident was established.

Reproduce AUD-01/AUD-02 with `node docs/audit/reproduce_2026-11-05.mjs` after `npm ci`. It uses synthetic DEMO records and fake cache/network failures only, and changes no app or user storage. Its output is an observation, not a passing recovery certification.

## GitHub and deployment evidence

| Item | Observed state on 5 Nov |
|---|---|
| Default and production branch | `ccr-8b686ba2-vitt45`, HEAD `6136ba8`; `main` remains initial commit `92b2c3c` |
| [PR #1](https://github.com/mistybari99/Trillionaire-Me/pull/1) | Open, API mergeable=true / clean; this reports merge mechanics, not audit approval |
| [PR #2](https://github.com/mistybari99/Trillionaire-Me/pull/2) | Open, API mergeable=true / unstable; 190 commits behind and 2 unique commits relative to the production branch |
| PR #2 unique files | [content-first-design.md](https://github.com/mistybari99/Trillionaire-Me/blob/claude/upbeat-franklin-8zebjp/docs/design/content-first-design.md), decision log, roadmap and catalog report; no unique app source changes |
| [Latest inspected CI](https://github.com/mistybari99/Trillionaire-Me/actions/runs/41677007554) | Success for `6136ba861c85ad1630af2443e56d422a6a8a0276`; latest five inspected runs successful |
| Cloudflare target | Existing Worker `trillionaire-me`, assets enabled; workers.dev enabled at https://trillionaire-me.mistybari99.workers.dev |
| Build connection | GitHub `mistybari99/Trillionaire-Me`, root `/`, branch includes only `ccr-8b686ba2-vitt45`; build `npm run build`, deploy `npx wrangler deploy` |
| Latest Cloudflare build | `33372698-37e4-4d21-a52f-331a8f4a7f15`, success, commit `6136ba861c85ad1630af2443e56d422a6a8a0276`, stopped 3 Nov 16:53:55 UTC |
| Deployment metadata | `dbc38aa9-e6d2-43ad-a13a-2bf0fb85b7b7`, 3 Nov 16:53:51 UTC, version `d003106e-cb3e-49e0-b6bd-ed99cf426773` at 100%. Build/deployment times align; this is metadata verification, not a live UI smoke test. |

The existing Worker is retained. Opening this audit PR against the production branch does not push to that branch; merging into it would trigger the existing auto-deploy. No production deployment, account change, PR merge, branch deletion or permission change was performed.

## Verification record

Local environment: Node `24.22.1`, npm `11.9.0`; repository CI selects Node 22. Dependencies installed from the unchanged lockfile using a writable `/tmp` npm cache. Initial sandbox-only attempts lacked tools/cache access; final outcomes below replace those setup failures. Browser checks need local server/network capability.

<!-- verification-results -->
| Check | Result |
|---|---|
| `npm ci --cache /tmp/tm-npm-cache` | Passed; lockfile unchanged |
| `npm run typecheck` | Passed |
| `npm test` | 158 files, 1,941 tests passed; Node 24, network/local-server capability and writable npm cache; 189.18 seconds. A first restricted-sandbox attempt failed the nested npx check and was stopped; this complete run passed. |
| `npm run build` | Passed; 62 precache URLs; chunk-size warning described in AUD-07 |
| `node tools/e2e.mjs` | 88 passed / 0 failed in Chromium; 0 unexpected third-party requests and 0 CSP violations in the tested flows. Provider calls are mocked or disabled; not a physical-phone run. |
| Failure-path observations | AUD-01 and AUD-02 reproduced with synthetic DEMO records and fake failed cache/network writes |
| Plan/link validation | `node tools/check_plan.mjs`: validates 27 work packages, all 213 archived task IDs + 20 reminder/gap references, dependencies, maintained local links and four byte-identical archives |

Dated machine-readable result summary: [2026-11-05 verification evidence](evidence/2026-11-05.json). Routine `evidence/e2e-report.json` changes from running the browser checks are excluded from the PR.
<!-- /verification-results -->

The original Register v2_0 stays unchanged. No requirements are promoted to Verified by this documentation work. The 3 Nov owner-demand table/report and module boxes remain dated inventories, not a new full-product acceptance claim. See [the active tracker](../plan/PLAN_TRACKER.md) for all follow-ups and [the check log](../plan/PLAN_CHECK_LOG.md) for migration evidence.
