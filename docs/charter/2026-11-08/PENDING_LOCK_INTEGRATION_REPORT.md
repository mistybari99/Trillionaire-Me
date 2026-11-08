# Pending Text Size Lock Integration Report

Date: 2026-11-08

Baseline: GitHub default `ccr-8b686ba2-vitt45` at `3a5cc3253ccdda98b8486afe574f56215ea0f227`

Local branch: `codex/text-size-lock-integration-2026-11-08`

Status: local integration; not pushed or deployed.

## User problem and result

The 50–150% slider remains continuously adjustable, but a deliberate Lock/Unlock control can now prevent accidental pointer, touch, keyboard and dispatched-input changes without rounding or replacing the saved percentage. The state persists across routes and reload. If durable storage rejects the change, the app says so and uses a page-session fallback.

## Changed-file map and merge decisions

| Path | Decision | Result |
|---|---|---|
| `src/ui/state.ts` | Reapply intent, do not copy old file | Added durable key plus sessionStorage-first fallback and page-memory last resort; durable success clears transient override. |
| `src/ui/settingsUi.ts` | Rebase and harden | Native disabled slider; guarded input listener; dynamic localized action name; `aria-pressed`; described state; in-place update keeps keyboard focus. |
| `src/ui/settingsRegistry.ts` | Merge ownership | Text-size row owns `scale`, `scaleLocked`, `tm:ui:scale`, `tm:ui:scaleLocked`. |
| `src/ui/styles.css` | Small additive merge | Flexible row, disabled affordance and minimum 44×44px lock target. |
| `src/i18n/packs.ts` | Merge into current packs | Five EN/BN source keys; Mix derives through the existing transform. |
| `tests/text_size.test.ts` | Rebase and expand | Precision, routes, dispatched input, focus, read/write exceptions, contradictory values, both-storage failure and three locales. |
| `tools/e2e.mjs` | Extend current browser suite | EN/BN/Mix; 50/100/150/200%; focus, persistence, accessible state, disabled input and unlock restoration. |
| `tests/fixtures/bangla_counts.json` | Update current fixture | Exactly five added strings. |
| Audit/plan/evidence docs | Preserve and regenerate | Proposal-only dropdown audit, updated lock audit, current plan log and freshly generated browser report. |

## Defects found and fixed during reconciliation

1. The recovered module-global fallback could remain stale in a long-lived module/test context. It is now page-session scoped with a clear precedence: session override → durable value → unlocked default; memory is used only when both storage APIs reject access.
2. The recovered rerender approach could replace the button and lose keyboard focus. Lock state is updated in place and focus remains on the button.
3. A disabled control normally blocks real input but programmatic dispatch can still invoke listeners. The input handler now checks lock state and restores the precise saved value.
4. Contradictory session and durable values were not specified. The session fallback now wins only for that page session and is cleared after a later durable save.
5. The older browser coverage omitted Mix. Current unit/browser coverage includes EN, BN and Mix.

## Verification

Exact final command results are recorded after the last combined-source run:

- `npm test -- tests/text_size.test.ts tests/settings_shell.test.ts tests/settings_search.test.ts tests/settings_a11y_i18n.test.ts` — 42/42 passed.
- `npm test -- tests/bangla_apply_back.test.ts tests/hosting_headers.test.ts` — 16/16 passed with read-only subprocess permission (sandbox-only EPERM without it).
- `npm run typecheck` — passed.
- `node tools/check_plan.mjs` — passed: 34 active packages, 213 retained task IDs + 20 references, 141 local links, acyclic dependencies.
- `git diff --check` — passed.
- `npm test` — 2,688/2,688 passed across 230 files (the full rerun used read-only subprocess permission for two existing child-process tests).
- `npm run build` — strict typecheck and Vite production build passed; only the pre-existing native-config and large-chunk warnings were printed.
- `CHROMIUM_PATH=/usr/bin/chromium node tools/e2e.mjs` — 138/138 passed; report regenerated at `evidence/e2e-report.json`.

## Residual risk and manual gates

- Physical Android touch/drag behavior, TalkBack announcement order and 44px measurement remain unverified.
- Native Bangla wording needs the named reviewer; automated pack parity is not linguistic approval.
- Browser storage-failure tests model exceptions; vendor-specific private-mode behavior still needs a phone check.
- No production CI, Preview, remote release or deployment was run.

## Checkpoint and final status

Final automated status: **LOCAL INTEGRATION PASS**. Local code checkpoint: `5305019` (`feat: integrate and harden text size lock`). Production-ready must not be claimed until physical Android/TalkBack and approved remote release gates pass.
