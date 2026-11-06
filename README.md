# Trillionaire Me

A Bangla-first, phone-first planning app (installable PWA) for one person's goals, money and Deen. Personal records stay on the device; AI, cloud record sync and paid services are not enabled. Offline use is supported, with interrupted-install and recovery gaps recorded in the current audit. Wikipedia search runs on user action; prayer-time updates use a separate opt-in.

Current engineering review: [5 Nov audit](docs/audit/REPOSITORY_AUDIT_2026-11-05.md) and [short Bangla audit summary](docs/owner/AUDIT_SUMMARY_2026-11-05_BN.md). Work status lives only in [PLAN_TRACKER](docs/plan/PLAN_TRACKER.md); [TODO](docs/TODO.md) selects next work and [ROADMAP](docs/ROADMAP.md) defines phases. Older reports remain dated historical evidence. Follow-up: [reliability fixes and selected UI direction](docs/audit/RELIABILITY_FIXES_2026-11-05.md), then [Action Desk UI implementation and evidence](docs/audit/ACTION_DESK_UI_2026-11-05.md), plus [controls, shortcuts and multi-selection](docs/audit/USABILITY_CONTROLS_2026-11-05.md).

Spec of record: `docs/spec/`. Rules for every session: `CLAUDE.md`. Decisions and undo steps: `DECISIONS_LOG.md`. Current status: `docs/plan/PLAN_TRACKER.md`. Latest audit: `docs/audit/REPOSITORY_AUDIT_2026-11-05.md`.

## Where we are (3 Nov 2026)
Bangla one-page summary for the owner: `docs/owner/WHERE_WE_ARE_BN.md`.

- Many G1–G4 features are built and automated tests exist; gate acceptance still needs the outstanding device/reviewer evidence. Real data is allowed on the device only, behind a per-device consent tick (D-B, approved 25 Oct 2026).
- Data safety: save-failed banner, storage persist request, weekly backup reminder, optional PIN lock, record migration with a copy saved first.
- Default look: **Light / Colorful / Futuristic** (D-E, updated 25 Oct 2026). Three more looks are options under Settings > Look: Ink & Paper, Emerald/Obsidian, Classic/Broadsheet. Dark mode follows the phone.
- Languages: English, Bangla and Mix, switchable in the app. Bangla text is a draft marked as unreviewed until the reviewer signs off (TM-TST-161).
- Still waiting on the owner: phone offline test, lock-screen check, prayer-time check, Bangla review, and the approvals D-C (AI / cost) and D-D (scripture).

## Run, test, build
```
npm ci
npm run dev              # local dev server
npm run typecheck        # tsc --noEmit (strict)
npm test                 # 1,941 tests passed in the 5 Nov audit; count changes with the code
npm run build            # type check + production build into dist/
node tools/e2e.mjs       # browser checks on the built app (needs Playwright Chromium; serves dist on port 4174)
node tools/check_plan.mjs # active tracker, legacy IDs, archives and maintained doc links
npm run screenshots      # 360 px screenshots, Bangla and English
npm run evidence         # writes evidence/*.json from a real test run
python3 -I tools/update_register.py docs/register/Trillionaire_Me_Requirements_Register_v2_0.xlsx docs/register/Trillionaire_Me_Requirements_Register_v2_1_evidence_refresh.xlsx
```
The Register v2_0 file is the original and is never edited; v2_1 is a regenerated copy. Do not commit `evidence/` run files from routine test runs.

## Hosting and deployment
Hosting is already connected to the existing Cloudflare Worker `trillionaire-me`: https://trillionaire-me.mistybari99.workers.dev . Cloudflare builds `ccr-8b686ba2-vitt45` using `npm run build:verified` and deploys with `npx wrangler deploy`. A merge/push into that branch triggers production deployment; a review branch must stay separate until ready. There is no Pages migration in this audit.

The app is a static site: the build produces `dist/`, and `wrangler.jsonc` serves it as a single-page app. The service worker precaches built files; required offline download failures now reject installation (AUD-02). Physical phone acceptance remains open in the tracker. The 5 Nov audit itself did not deploy; the subsequent reliability release activated the exact-production-CI build gate. See [deployment gate](docs/deployment/CI_GATE.md).

## Stack
PWA, strict TypeScript, no UI framework (D-A approved). Pure core library in `src/core` with adapters in `src/adapters` (IndexedDB through Dexie). Fonts are bundled; external Wikipedia/prayer requests are limited to their user-action/opt-in flows. Look tokens: top of `src/ui/styles.css` and `src/ui/themes.ts`.

| Path | What |
|---|---|
| `src/core` | unknown is not 0 value model, namespaced store (demo and real never mixed), secret rejection, export guard, planner, backup, app lock, migration |
| `src/catalog` | versioned field catalog (what/why/example/format/privacy), glossary, validator |
| `src/schema` | entity skeletons |
| `src/i18n` | English / Bangla / Mix packs |
| `src/library`, `public/content` | offline content packs, paths, ready systems |
| `src/modules` | Capability Status registry (what is built and what is not) |
| `tests`, `tools` | vitest suites, browser e2e, evidence and Register tools |
| `docs/register` | original Register and the v2_1 evidence copy |
