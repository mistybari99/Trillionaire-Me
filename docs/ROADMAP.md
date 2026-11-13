# Delivery roadmap

Updated 5 Nov 2026. This page defines sequence, not task status. The [active tracker](plan/PLAN_TRACKER.md) owns every current work package. Preserve the canonical spec and approved decisions; module build counts are not gate acceptance.

| Phase | Outcome | Packages / exit evidence |
|---|---|---|
| 1 — Reliable local app | Honest recovery, safe interrupted updates and validated deployment path | AUD-01/02/03, OPS-01; injected-failure and offline browser checks |
| 2 — Evidence matches behavior | Current feature acceptance, fresh mobile screenshots, prayer-source checks, requirements traceability | VERIFY-01/02/03/04; dated artifacts, human gates still separate |
| 3 — Clear integration and smaller delivery | Reconciled design proposals, accurate PR scope, measured offline payload | DESIGN-01, OPS-02, PERF-01; small reviewable PRs against the actual app baseline |
| 4 — Personal-edition acceptance | Physical Android recovery/offline/privacy, prayer comparison, Bangla and usability reviews | OWNER rows; named device/reviewer reports, not CI alone |
| 5 — Remaining approved capability | Defined override/unit-economics behavior and useful visual-reference work | BUILD rows after their dependencies; no invented inputs |
| Later gates | Encryption, AI/provider costs, scripture, cloud and G8 public/staff edition | DECISION rows; explicit approvals and gate-specific plans before enabling |

Existing hosting is a Cloudflare Worker with static assets and automatic builds from `ccr-8b686ba2-vitt45`. No Pages migration or production-branch switch is part of this audit. A merge into that branch triggers deployment.

[Original roadmap and visual-idea decisions](plan/archive/ROADMAP_2026-11-03.md) remain historical input. Every unimplemented idea must be reconciled through VERIFY-04/BUILD-03 rather than silently dropped or assumed complete.
