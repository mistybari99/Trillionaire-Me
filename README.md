# Trillionaire Me

A Bangla-first, phone-first planning app (installable PWA) for one person's goals, money and Deen. It works offline after the first visit. Data stays on the device; there is no AI, no cloud and no paid service switched on.

Spec of record: `docs/spec/`. Rules for every session: `CLAUDE.md`. Decisions and undo steps: `DECISIONS_LOG.md`. Current plan: `docs/TODO.md`. Latest audit: `docs/audit/FULL_AUDIT_2026-11-01.md`.

## Where we are (1 Nov 2026)
- Work gates G1 to G4 are built and tested in demo mode; real data is allowed on the device only, behind a per-device consent tick (D-B, approved 25 Oct 2026).
- Data safety: save-failed banner, storage persist request, weekly backup reminder, optional PIN lock, record migration with a copy saved first.
- Default look: **Light / Colorful / Futuristic** (D-E, updated 25 Oct 2026). Three more looks are options under More > Display: Ink & Paper, Emerald/Obsidian, Classic/Broadsheet. Dark mode follows the phone.
- Languages: English, Bangla and Mix, switchable in the app. Bangla text is a draft marked as unreviewed until the reviewer signs off (TM-TST-161).
- Still waiting on the owner: phone offline test, lock-screen check, prayer-time check, Bangla review, and the approvals D-C (AI / cost) and D-D (scripture).

## Run, test, build
```
npm install
npm run dev              # local dev server
npm run typecheck        # tsc --noEmit (strict)
npm test                 # vitest: about 1,100 tests (core, DOM, i18n parity, guardrail scans)
npm run build            # type check + production build into dist/
node tools/e2e.mjs       # browser checks on the built app (needs Playwright Chromium; serves dist on port 4174)
npm run screenshots      # 360 px screenshots, Bangla and English
npm run evidence         # writes evidence/*.json from a real test run
python3 -I tools/update_register.py docs/register/Trillionaire_Me_Requirements_Register_v2_0.xlsx docs/register/Trillionaire_Me_Requirements_Register_v2_1_evidence_refresh.xlsx
```
The Register v2_0 file is the original and is never edited; v2_1 is a regenerated copy. Do not commit `evidence/` run files from routine test runs.

## Deploy (when the owner connects hosting)
The app is a static site: `npm run build` produces `dist/`. `wrangler.jsonc` points Cloudflare to `dist/` as a single-page app. Nothing is published or connected until the owner does the account step (see `CLAUDE.md` section 8). The service worker (`public/sw.js`, precache list from `tools/precache.ts`) caches every built file so the app opens offline after the first visit.

## Stack
PWA, strict TypeScript, no UI framework (D-A approved). Pure core library in `src/core` with adapters in `src/adapters` (IndexedDB through Dexie). Fonts are bundled; zero network calls at runtime. Look tokens: top of `src/ui/styles.css` and `src/ui/themes.ts`.

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
