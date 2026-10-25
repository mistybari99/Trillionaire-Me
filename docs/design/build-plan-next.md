# Build plan — next (serial, 25 Oct 2026)

Source: docs/design/owner-demand-audit.md (gaps). This file lives in docs/ and is NOT part of the app build (not in src/ or public/).

Rules for every step:
- One agent at a time. Keep `npx tsc --noEmit`, `npx vitest run`, `npx vite build`, `node tools/e2e.mjs` green before each push.
- No AI (D-C), no server sync, no Google key, no scripture (D-D), no paid service.
- Bangla copy stays plain, Latin digits, reviewer-pending flag kept.
- No streak, rank, grade or shame wording. Unknown ≠ 0.

## Order
1. **Real-data entry forms.** Every entry form can save real records after the D-B consent tick. Today, Habits and Plan read real + demo.
2. **Template chooser on every dashboard.** Same data, a different view, chosen per screen (Journey, Money, Habits, Plan, Report).
3. **Charts with a text version.** Money, Report, Review, Habits (bars, rings, grid tracker). Each chart has a text equivalent.
4. **Encrypted backup.** Passphrase-based, WebCrypto, covers demo and real data. Restore asks for the passphrase.
5. **Remaining visual-batch ideas.** Grid tracker, life wheel, SWOT, SMART goal, goal progress %, micro-animations with reduced-motion.
6. **Docs refresh.** Fix docs/design/m-list-status.md (M19 is built), refresh the Register evidence, and re-run the owner-demand audit.

## Owner decisions still open (not in this plan)
- AI (D-C), server sync, Google key, Supabase account, scripture (D-D).
