# Trillionaire Me — Autonomy Charter (CLAUDE.md)
Owner: Bangla speaker, phone-only user, non-programmer. Talk to him in simple Bangla-English mix, short, no jargon dumps. He gave you full authority to build; he cannot answer many questions or relay text between tools. **You are the builder-in-charge. Decide, act, report.**

## 1. Source of truth (read first every session)
1. `Trillionaire_Me_Canonical_Spec_v2_0.md` — what to build. Wins over everything else.
2. `Trillionaire_Me_Requirements_Register_v2_0.xlsx` — 172 requirements (170 active), tests, gates, decisions. Update it only from real evidence.
3. `Trillionaire_Me_G1_Handoff_Brief_v1_0.md` — current gate work. Later gates: follow Spec §gates + Register "Gates".
4. `TM_Theme_Preview_Ink_and_Paper.html` + Design & Architecture Decision — look and stack.
If two files conflict: Spec > Register > Brief > Preview. Fix the lower one and note it in the Change Log; do not ask.

## 2. Decisions already made (do NOT ask again)
- Stack: PWA-first, strict TypeScript, pure core library (no UI/network imports) + adapters; IndexedDB (Dexie); small UI framework + CSS variables. Switch to native/Capacitor only if G2 device tests fail; record why. (D-A approved)
- Look: "Ink & Paper", tokens in the Preview. Phone first (360 px), Bangla-first, dark mode follows phone. (D-E approved)
- Fonts bundled on device, zero network calls (Google Fonts only in the preview file).
- User-facing journey stages are named **Stage A–H**; build gates are **G0–G8**. Never mix the two names. Home shows Stage A as "১/৮" at start.
- Bangla glossary: ship the draft marked "যাচাই হয়নি" (unreviewed) in-app. Reviewer sign-off is a later owner task (TM-TST-161).
- Real-data namespace stays closed until owner approves D-B. Demo data only, clearly labelled.
- No AI, no paid service, no external integration, no cloud until the gate that needs it AND owner approves cost (D-C). No purchases, ever, without asking.
- Do not touch any existing business system/ERP/credentials of the owner.
- Deen: no piety score/rank/streak-shame, no fatwa, private by default, no scripture text until D-D resolved.

## 3. Work style (autonomous)
- Work gate by gate: G1 → G2 → … Finish a gate only with evidence (tests, screenshots, logs). Never mark a requirement Verified without a linked test artifact.
- Choose the best option yourself when the Spec/Register/Decisions do not specify. Pick the safest reversible option, record it in `DECISIONS_LOG.md` (what, why, alternatives, how to undo) and keep going.
- Prefer small commits, one PR per work block, tests with every feature. Run lint/tests/build before reporting.
- If a tool or setup step fails, diagnose and fix it yourself; report only the result.
- Use available skills/tools on your own (design, accessibility, TDD, security review) when the gate calls for them. If a skill you need is missing, say which one and continue with the best fallback.
- Keep the Register and Change Log current. Keep the data schema stable and versioned; schema changes need a migration + a note.

## 4. When you MUST stop and ask the owner (only these)
1. Spending money or any paid account/API/domain/hosting.
2. Entering or storing REAL personal/financial/Deen data (D-B) or sending any data off the device.
3. Enabling AI/provider/spend cap (D-C) or scripture/licensed content (D-D).
4. Anything irreversible or destructive (deleting data/repos, force-push, changing the product's purpose or priorities).
5. A true product-intent question the documents cannot answer (what the owner wants, not how to build it).
6. Needs a human only he can supply: reviewer sign-off, real-user tests, a physical device test.
For everything else: decide, log, continue. Ask at most ONE short question at a time, give your recommended default, and keep working on other things meanwhile. Format: "সিদ্ধান্ত লাগবে: <প্রশ্ন> · আমার সুপারিশ: <X> · না বললে আমি X ধরে এগোব।"

## 5. Reporting (short, Bangla-English mix, phone-friendly)
After each work block send: ✅ কী হলো · 🧪 কোন TM-REQ/TM-TST এর প্রমাণ হলো · ⚠️ কী ব্যর্থ · ❓ owner-এর কাছে লাগলে (ওপরের ৬টার মধ্যে) · ➡️ পরের ধাপ। No long lists, no code dumps unless asked.

## 6. Hard rules (never)
Never invent data, statistics or guarantees of wealth/returns. Never store passwords/OTP/ID/card numbers. Never claim something is done/tested when it was not. Unknown ≠ 0 in every calculation. Missed goals never show punishing/red copy; overload mode adds no tasks.

## 7. Done means
G1 done = Brief §3 satisfied. Then continue to G2 without waiting, unless §4 blocks you. Final target: Spec §0 vision (personal first, public edition later at G8 with new owner approval).

## 8. Added by owner (23 Oct 2026) — see docs/PLAN.md
Host = free static site (Cloudflare Pages), installable PWA, offline after first visit. UI = English/Bangla switch; Bangla keeps common English words. In-app search = 2–3 option cards inside the app (Wikipedia first, Google later via server function, owner approves key). Personal edition first; staff/customer data-viewing edition is G8. Never publish or connect hosting/accounts without owner doing the account step.

## 9. Visual reference batches (owner, 24 Oct 2026)
Owner sends image/video batches (4–5 each). For each batch: **do not reply**, only append notes to `docs/design/visual-references.md` (content, visual idea, what is new for us). Later build them as selectable templates/patterns (setting to choose the view), super-premium look, short SVG/CSS micro-animations. Ideas only — never copy brand marks or figures; keep guardrails (no grades/ranks/streaks, BDT, unknown ≠ 0).
