# PLAN (living) — updated 24 Oct 2026

> Master sequence now lives in `docs/ROADMAP.md`. This file keeps owner decisions and gate status.

## Owner decisions added this session
- **Hosting:** static site on a free host (Cloudflare Pages recommended, private repo). Works as installable PWA; offline after first visit; internet only for search/AI/cloud features. Not published yet — owner connects the host account.
- **Languages:** English / Bangla switch; Bangla keeps common English words (Demo, Backup, Online…).
- **In-app search:** user taps "suggest" → 2–3 cards inside the app → tap fills the field. Engine order: Wikipedia (no key) first, Google later via Supabase edge function (owner approval for key/cap).
- **Database:** none needed for personal use (data stays on phone, IndexedDB). Supabase free project = optional cloud backup later (D-B approval).
- **Staff/customer edition** (owner sees others' entries): separate, later (G8), needs consent + per-user isolation + legal review. Personal edition first.

## Gate status
| Gate | State |
|---|---|
| G0 | frozen by owner |
| G1 | built, evidence in `evidence/`; open: usability sessions, Bangla review |
| G2 | repo+Dexie ✅, backup/restore ✅, op-queue/conflict rules ✅; **next:** app on IndexedDB, PNG install icons, notifications privacy, PWA-vs-native note; owner: real-phone airplane test |
| G3 | in progress: scheduler, goal tree, finance maths, stage rules + journey log ✅ wired (Time & tasks, Money, Journey, Journey log). Open: assessment scoring, path fit + opportunity library, reality-changed loop, 90-day review, editable stage templates |
| G4 | in progress: Wikipedia provider ✅, option cards on 5 intake fields ✅; open: own-options list, saved offline list, more screens |
| G5 | Deen content verification (needs D-D) |
| G6 | AI/automation (needs D-C) |
| G7 | privacy/legal/real data (needs D-B) |
| G8 | pilot, PC, staff edition, public edition |

## Life Success brief — selective (docs/design/life-system-integration.md)
Only what fits the running app: "I'm stuck" flow → habits without streaks → weekly review/missed-day reasons → goal tree view/skill gap. The big library/tags/20-category build is parked.

## Status 24 Oct 2026
- Tests: 163 unit passing, TypeScript clean, build OK, e2e 36 PASS / 0 FAIL, 60 screenshots no horizontal overflow.
- R1 (ROADMAP §4): daily inspiration card with theme chip, bilingual, calm fade-in (reduced-motion safe) — done. Next-step highlight (B6) still open.
- Register rows NOT changed in this pass (update_register.py needs input files; evidence JSON only).

## Next actions (in order, superseded by ROADMAP §4 for build order)
1. App storage → IndexedDB (write-through, migrate localStorage) 
2. PNG icons + manifest for install
3. Notification privacy settings (lock-screen hiding)
4. PWA-vs-native comparison note
5. Hosting guide for owner (Cloudflare Pages steps)
6. G3 start
