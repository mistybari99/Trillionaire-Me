# Static branch Previews

The repository opts into Workers Previews with top-level `previews: {}` and pins project-local Wrangler **4.158.0** in package.json and the lockfile. Production keeps Worker `trillionaire-me`, compatibility date `2026-10-19`, the existing static SPA asset configuration, `npm run build:verified` and `npx wrangler deploy`. No remote settings are changed by this code patch.

## Validation before a Preview

Use `npm run build:preview:verified` as the **nonproduction Preview build command**, followed by the Preview command `npx wrangler preview --ignore-base-config`. The ignore flag makes this deliberately binding-free static Preview use the checked-in configuration instead of any dashboard Preview base resources. Do not replace the production build/deploy commands. Existing Workers Builds integrations may require a one-time switch to the new Worker Previews model; that remote switch is separate from this patch and cannot be reversed.

If the current integration exposes one shared build command for production and previews, leaving `npm run build:verified` there will intentionally reject nonproduction builds before their Preview command. Configure a distinct Preview build setting when supported; otherwise review a branch-dispatch build wrapper before activation. Do not weaken the production gate or use a Preview command that runs after a failed production-only build. `wrangler versions upload` is not a replacement for `wrangler preview`.

The Preview gate requires Workers Builds metadata (`WORKERS_CI=1`, nonempty nonproduction `WORKERS_CI_BRANCH`, and a full `WORKERS_CI_COMMIT_SHA` matching git HEAD). It waits for this public repository's `ci.yml` **push** workflow for that exact SHA and branch. The latest matching run must succeed, and its current-attempt `check` job must complete successfully. PR-only, production/other-branch, different-SHA, failed, cancelled, skipped, missing and stale checks cannot authorize it. Rate limiting, unavailable GitHub and timeouts fail closed, using the same polling budget and public read-only API as the [production gate](CI_GATE.md). No GitHub token is added. Local ordinary builds remain `npm run build`.

## Public synthetic-data scope

Preview URLs are public unless separate access controls are configured. Use only bundled demo content and synthetic records entered in the Preview browser. Do not import real backups or personal/financial/Deen records. Each Preview origin has separate browser storage; that fact does not make the URL private or authorize production resource access.

This app serves static assets and stores its records locally. The empty Preview block adds no bindings, resource IDs, secrets, routes, account, paid service or cloud sync. Existing opt-in network integrations remain opt-in; do not provide real location or other private inputs during QA. Before any later resource binding is introduced, review the Preview resource matrix: naming something Preview does not establish isolation, and service bindings can call production.

After activation, record the exact branch/SHA, successful push CI run, Preview URL and deployment URL, then test first-run consent, navigation/help, synthetic saves, language/theme/text-size preferences and offline reload there. A returned URL or local CLI help output alone does not establish remote behavior. Physical phone/TalkBack acceptance remains separate.

## Local verification

`npx vitest run tests/deployment_gate.test.ts tests/preview_deployment_gate.test.ts` checks both the preserved production contract and Preview failure/success cases. `npm run typecheck` checks types. The installed schema supports `previews`, and `npx wrangler preview --help` documents the command and `--ignore-base-config`. A packaging dry run may be done after the app build when the shared build directory is available; this patch does not itself claim a remote Preview deployment.

References: [Preview configuration](https://developers.cloudflare.com/workers/previews/configuration/), [resources and isolation](https://developers.cloudflare.com/workers/previews/resources/), [Workers Builds branch controls](https://developers.cloudflare.com/workers/ci-cd/builds/build-branches/), [Preview commands](https://developers.cloudflare.com/workers/wrangler/commands/workers/#preview).
