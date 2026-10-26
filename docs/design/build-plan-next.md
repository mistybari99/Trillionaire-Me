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

## Owner decisions of 26 Oct 2026 (added to plan; nothing built yet)
1. **Overall progress (one %).** Calculated only from the user's entered tasks. Rises on completion; falls when tasks or plan are added or changed; recalculated on plan change. No tasks = Unknown, not 0%. Neutral wording, never red. Prompt: "Are there more tasks to add?" At goal creation: manual % or automatic. Automatic: equal weight or task-size weight. Per-goal progress stays.
2. **Advice cards.** Rule-based, with a reason, no invented amounts. Built-in knowledge base for general suggestions. Online suggestions inside the app only after owner approves cost and provider (D-C); until then offline and rule-based.
3. **Cloud.** Free-cloud port option only (ports/Connections), off until approved. Text: "Saved on this device".
4. **Deen.** Plans and reminders only; no scripture text until D-D. Build exact prayer times (verify method with owner), notifications, azan, one-tap mark.
5. **3D.** Only if bundled locally; no runtime internet.
6. **Design model.** Owner to choose the main model (recommend 1 Light Futuristic main, 3 Ink and Paper option). Build starts only after owner approves.

## Owner list "What is possible / what we can add" — status (26 Oct 2026)
Owner asked to keep this in the build plan and to wait for the next usage-limit reset before more building.

| Item | Status |
|---|---|
| Offline PWA, data on device | Built; full-file offline cache added (0a63104). Real-phone airplane test = owner |
| Four looks in one app (Design version) | Built (28adce2): Light Futuristic default, Ink & Paper, Emerald Obsidian, Classic |
| English / Bangla / Mix | Built; Bangla text still draft until TM-TST-161 |
| 3D logo bundled locally | Built (inline SVG, 0a63104) |
| Reward animations | Built (ring draw, pop, glow; reduced-motion safe) |
| Rule-based advice with reason | Built (Next best action card) |
| Goal Universe with list view | Built (#/journey/universe) |
| Home summary cards | PARTIAL: built net worth, income, expenses. TODO: tasks and goal-steps cards; saving card only from the user's own entries |
| SMART funnel visual | TODO: draw funnel (S-M-A-R-T -> committed goal) to replace text-only guide |
| Local auto-snapshot backups | Built (reminder OFF by default) |
| Overall progress % | Built (28adce2) |

Next block after limit reset: SMART funnel visual, tasks and goal-steps home cards, then prayer-time/azan/notification verification and risk, venture, team, North Star forms (real-data ready).
