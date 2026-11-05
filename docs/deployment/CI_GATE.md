# Production CI gate (AUD-10 / OPS-01)

The existing Workers Builds trigger runs `npm run build`, then `npx wrangler deploy`, independently of GitHub tests. `npm run build:verified` now first verifies successful GitHub CI for the **exact production commit**, then builds. It does not deploy or change an account.

## Reviewed configuration to apply after this code reaches production

For Worker `trillionaire-me`, existing trigger `9b487d1f-40dc-4770-8d34-1e39e705e34e`, change only:

| Setting | Existing | Proposed |
| --- | --- | --- |
| Build command | `npm run build` | `npm run build:verified` |
| Deploy command | `npx wrangler deploy` | `npx wrangler deploy` |
| Production branch | `ccr-8b686ba2-vitt45` | `ccr-8b686ba2-vitt45` |
| Root | `/` | `/` |

No remote setting has been changed by this patch. Merge the gate first, then apply the build setting in Workers → `trillionaire-me` → Settings → Build. Keep the account, token, trigger, branch and deploy command. Retrying an existing build uses current build settings; retries of older commits without this npm script fail safely. Verify a successful new commit and a deliberately failing check on an isolated test branch/Worker before claiming the remote gate is active; do not deliberately fail or deploy the production branch for this test. Local gate failure cases are covered by `tests/deployment_gate.test.ts`.

## What authorizes a build

`tools/check_deploy.mjs` checks documented Workers metadata (`WORKERS_CI=1`, `WORKERS_CI_BRANCH`, `WORKERS_CI_COMMIT_SHA`) against the actual Git checkout. It calls the public GitHub API for this repository's `ci.yml` push runs, filters the exact SHA, branch, repository and workflow path, then selects the latest run. A completed successful workflow must also have a completed successful `check` job from that run's current attempt. That job runs plan integrity, TypeScript, unit tests, production build, and Chromium browser/offline checks. PR runs and successful checks for a different commit cannot authorize production.

CI can start concurrently with Workers Builds, so the gate polls at most 16 times, one minute apart (about 15 minutes plus bounded HTTP requests). Failed/cancelled/skipped CI, missing checks, timeouts, invalid metadata, unavailable GitHub, malformed responses and rate limiting stop the command with a nonzero exit before build/deploy. Retry Workers Builds after CI passes if CI exceeded the wait. No access token or paid service is added. API calls use a ten-second timeout and refuse redirects.

## Constraints and tradeoff

This repository is public, so CI can be checked without secrets. Anonymous GitHub REST limits (normally 60 requests/hour per source IP) can be shared by build infrastructure; exhaustion blocks deployment and requires a later retry. A typical completed gate uses two requests; a full pending wait uses sixteen. This favors withholding a deployment over bypassing validation. GitHub outage or a CI run longer than the gate budget also blocks deployment.

The gate relies on the maintained `ci.yml` job named `check`; keep that job and its validation steps intact. Anyone authorized to edit production code/build settings can change or bypass a repository-owned gate. This does not replace branch protections or prove identical build artifacts: Cloudflare builds the verified source again using its own environment. GitHub CI uses Node 22; pin a matching Workers build Node version separately if reproducible environments are required. Manual Wrangler invocations remain outside this Workers Builds gate.

Running the entire browser suite inside Cloudflare was avoided because Chromium system dependency installation is already supported in GitHub's runner and is unverified in the Workers build image. The current Wrangler `build` configuration cannot enforce this remote setting: Workers Builds explicitly does not honor Wrangler custom build configuration.

References: [Workers build configuration and default variables](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/), [GitHub workflow runs API](https://docs.github.com/en/rest/actions/workflow-runs), [GitHub workflow jobs API](https://docs.github.com/en/rest/actions/workflow-jobs).
