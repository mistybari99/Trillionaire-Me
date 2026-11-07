# Production CI gate (AUD-10 / OPS-01)

The audited Workers Builds trigger originally ran `npm run build`, then `npx wrangler deploy`, independently of GitHub tests. It now uses `npm run build:verified`, which first verifies successful GitHub CI for the **exact production commit**, then builds. The npm script itself does not deploy or change an account.

## Activation observed — 5 November 2026

After the reliability code was merged, the existing production trigger's build command was changed to `npm run build:verified`. Cloudflare build `ea8b75fb-7f75-442e-9a9c-9cfc8262c98a` waited for and verified [production CI run 41979897074, attempt 1](https://github.com/mistybari99/Trillionaire-Me/actions/runs/41979897074) for commit `32bc54b7c04a8c08014b864f0507624283073869`, then built and deployed successfully. Deployment `c8b73f9d-2d99-4dd8-81dc-1d63803f6a96` serves version `9c01d08d-8bcf-4303-8018-4bf8c0297ce5` at 100% traffic. The integrating agent's receipt records matching online/offline build stamps at 06:30 UTC. This release preceded the Action Desk UI branch.

OPS-01 remains **Needs verification**: the successful path is observed remotely, but an isolated remote failed-CI blocking trial has not been performed. The 19 local gate cases do not substitute for that remote acceptance.

## Reviewed configuration (now applied)

For Worker `trillionaire-me`, existing trigger `9b487d1f-40dc-4770-8d34-1e39e705e34e`, change only:

| Setting | Audited original | Applied |
| --- | --- | --- |
| Build command | `npm run build` | `npm run build:verified` |
| Deploy command | `npx wrangler deploy` | `npx wrangler deploy` |
| Production branch | `ccr-8b686ba2-vitt45` | `ccr-8b686ba2-vitt45` |
| Root | `/` | `/` |

The original code patch prepared this configuration without changing remote settings; activation was subsequently observed as recorded above. Future changes belong in Workers → `trillionaire-me` → Settings → Build. Keep the account, token, trigger, branch and deploy command. Retrying an existing build uses current build settings; retries of older commits without this npm script fail safely. Verify a deliberately failing check on an isolated test branch/Worker before closing OPS-01; do not deliberately fail or deploy the production branch for this test. Local gate failure cases are covered by `tests/deployment_gate.test.ts`.

## What authorizes a build

`tools/check_deploy.mjs` checks documented Workers metadata (`WORKERS_CI=1`, `WORKERS_CI_BRANCH`, `WORKERS_CI_COMMIT_SHA`) against the actual Git checkout. It calls the public GitHub API for this repository's `ci.yml` push runs, filters the exact SHA, branch, repository and workflow path, then selects the latest run. A completed successful workflow must also have a completed successful `check` job from that run's current attempt. That job runs plan integrity, TypeScript, unit tests, production build, and Chromium browser/offline checks. PR runs and successful checks for a different commit cannot authorize production.

CI can start concurrently with Workers Builds, so the gate polls at most 16 times, one minute apart (about 15 minutes plus bounded HTTP requests). Failed/cancelled/skipped CI, missing checks, timeouts, invalid metadata, unavailable GitHub, malformed responses and rate limiting stop the command with a nonzero exit before build/deploy. Retry Workers Builds after CI passes if CI exceeded the wait. No access token or paid service is added. API calls use a ten-second timeout and refuse redirects.

## Constraints and tradeoff

This repository is public, so CI can be checked without secrets. Anonymous GitHub REST limits (normally 60 requests/hour per source IP) can be shared by build infrastructure; exhaustion blocks deployment and requires a later retry. A typical completed gate uses two requests; a full pending wait uses sixteen. This favors withholding a deployment over bypassing validation. GitHub outage or a CI run longer than the gate budget also blocks deployment.

The gate relies on the maintained `ci.yml` job named `check`; keep that job and its validation steps intact. Anyone authorized to edit production code/build settings can change or bypass a repository-owned gate. This does not replace branch protections or prove identical build artifacts: Cloudflare builds the verified source again using its own environment. GitHub CI uses Node 22; pin a matching Workers build Node version separately if reproducible environments are required. Manual Wrangler invocations remain outside this Workers Builds gate.

Running the entire browser suite inside Cloudflare was avoided because Chromium system dependency installation is already supported in GitHub's runner and is unverified in the Workers build image. The current Wrangler `build` configuration cannot enforce this remote setting: Workers Builds explicitly does not honor Wrangler custom build configuration.

References: [Workers build configuration and default variables](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/), [GitHub workflow runs API](https://docs.github.com/en/rest/actions/workflow-runs), [GitHub workflow jobs API](https://docs.github.com/en/rest/actions/workflow-jobs).

## First-build failures and the retry fix — 6 November 2026

Observed: the first Workers Build of many pushes failed (e.g. `6b14df4`, `73545d2`) while GitHub CI for the same commit passed, and a manual Retry after CI finished succeeded. The gate already polled for up to about 15 minutes, so waiting alone was not the gap. In the old code any temporary problem during the poll stopped the build at once: HTTP 403 or 429 (the public GitHub API's answer when the build network's shared address has used its hourly allowance of about 60 requests, which several concurrent builds each polling once a minute can exhaust), HTTP 5xx, a network error or the 10-second timeout. A Retry after CI is done needs only about two requests, which is why it passed.

Most likely root cause, **not yet confirmed from a Cloudflare build log** (the log is not reachable from the builder). Confirm on the next first-build failure: the last lines of the log will say `HTTP 403`, `HTTP 429`, a network error or `Timed out`.

Change (`tools/check_branch_ci.mjs`, shared by the production and preview gates): a temporary problem (403, 429, 5xx, network error, timeout, unreadable body) is logged and counts as one used attempt; polling continues. If every attempt hits it, the build still fails closed and reports the last reason. Hard failures stay immediate: failed or cancelled CI, missing check job, 404/401, redirects and wrong answer shape. The wait budget is unchanged (16 attempts, 60 seconds apart). `tests/deployment_gate.test.ts` covers retry-then-verify for 403, 429, 503 and a network error, all-attempts-temporary failing closed, and no retry for hard failures.

Remaining limits: a CI run longer than the budget (the browser checks took about 13 minutes once) still ends with the "Timed out ... Retry" message, and an exhausted shared rate limit that lasts the whole budget still blocks the build. A longer budget or an authenticated read would need a Cloudflare build-time limit check and a token, which needs the owner (not done).
