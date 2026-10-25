# Trillionaire Me — Content-First Design (Phase A–E)

**Input:** `docs/design/content-first-design-brief.md` (the owner's brief, unchanged).
**Authority:** Spec > Register > Brief > Preview (CLAUDE.md §1). Where the Spec and the owner's charter (CLAUDE.md §2) differ, this doc says which one it followed.
**Status:** Design direction + one clickable prototype. Nothing here is "implemented" or "Verified" (TM-REQ-121). The Register xlsx was **not** opened in this pass, so requirement statuses below are "not verified" unless a code or test file is named.
**Prototype (Phase D, visual only, demo data):** https://claude.ai/artifact/TgMksE7TrM9MnxKpcd2cxP (private; 4 phone screens).

---

## Phase A — Product understanding

### A.1 What the product is for
Trillionaire Me is a stage-gate life and business journey, not a dashboard. The user states a goal, assesses their own skills, interests, time, money and values, then moves through gates (each with a measurable exit). When reality changes, the plan changes and the goal stays. Each gate pass gives a visible achievement and a log entry. Deen and Akhirah are a first-class, private track, never a score. (Spec §1, §3, DP-01…DP-15.)

Personal edition first. Public edition later, after owner approval (Spec §12, G8).

### A.2 Confirmed vs proposed vs unknown

| Area | Status | Source |
|---|---|---|
| Journey loop: Discover → North Star → Path → Stage-Gates → Execute → Reality-changed → Gate pass → Review | **Confirmed** (owner's words, U) | Spec §3 |
| One-focus home: 1–3 actions + current gate + "what's next" | **Confirmed** | Spec §3.5, DP-03, TM-REQ-171 |
| Phone first (360 px), Bangla-first, dark mode follows the phone | **Confirmed** | Spec §7, CLAUDE §2 |
| Look: "Ink & Paper" tokens | **Confirmed** (D-E approved in CLAUDE §2) | CLAUDE §2, Preview file |
| Stage-gate exit rules, gate templates G-A…G-H | **Proposed default** (Spec says "সম্পাদনযোগ্য") | Spec §3.4 |
| Overload modes: Pause · Minimum Week · Reduce Scope · Resume Gently | **Proposed**, rules-based | Spec §3.6 |
| Path fit scoring weights | **Proposed**, configurable | Spec §3.3 |
| North Star definition (which "Trillionaire" meaning) | **Unknown — owner decides later**; the UI must show several side by side | Spec §3.2, X1 |
| Scripture / Quran text, prayer-time method, zakat rule version | **Unknown — blocked** (D-D, G5) | Spec §9, §11 |
| AI plan help | **Later** (D-C not approved) | Spec §6 |
| Bangla glossary wording | **Draft, unreviewed** ("যাচাই হয়নি") | CLAUDE §2, TM-TST-161 |
| Real-phone airplane-mode test, usability sessions | **Owner-only, open** | ROADMAP §2 (O1, O3) |

### A.3 Module inventory and implementation status

Status comes from `docs/ROADMAP.md` §1 and the file names in `src/`. I did not run the app in this pass.

| # | Module (Spec §4) | Status in repo (per ROADMAP / code) | Design note |
|---|---|---|---|
| M01 | Profile & consent | Consent screen built (More › Data); profile fields partial | Progressive intake, "জানি না" state on every field |
| M02 | Discover / assessment | Scoring + fit built (O5, tests/o5_assessment_fit) | Question-by-question, not one form |
| M03 | North Star & ladder | North Star ladder built (ROADMAP §7) | Several metrics side by side; no single % |
| M04 | Path & opportunity library | Draft list built (यাচাই হয়নি) | 2–3 option cards with "why" and "unknown" |
| M05 | Stage-gate engine | Built (stages, journey log, report) | Stage ladder + gate-pass moment |
| M06 | Goal / project / task / habit | Built (goal tree, habits, scheduler) | Tree/outline view |
| M07 | Resources & finance | Built (finance maths, 90-day cash flow, ESTIMATE labels) | Table first; chart only where it earns |
| M08 | Time & capacity | Time & tasks screen built | Deen & family time = hard constraint |
| M09 | Venture portfolio | Built (ventures, ownership fields) | Card list, no industry-specific fields |
| M10 | Team & delegation | Built (team roles) | Role-gap list |
| M11 | Research & options | Wikipedia cards on 5 fields; own-options list | Option cards, source + date on each |
| M12 | Reality-changed & history | Built (O6 reality loop, plan history) | Diff view + max 3 options |
| M13 | Deen, Ibadah & Akhirah | Private Deen screen, prayer log, fasting mark | Separate workspace, unscored |
| M14 | Health & family tracks | **Not verified in code** | Bounded, optional |
| M15 | Risk & stop criteria | Built (risks) | Calm list, no red |
| M16 | Reviews & KPIs | 90-day review built | Actual vs estimate labels |
| M17 | Knowledge & sources | Topics library, glossary | Source + freshness on each item |
| M18 | Visual layer | Inspiration card, horizon view (B2), ladder | Every visual has a text equivalent |
| M19 | Automation rules | Built (calm rules, pure functions) | Preview before apply |
| M20 | Sync, backup, export | Backup/restore built; sync rules in code; device test owed | Offline state visible on every screen |
| M21 | Security & privacy | Lock-screen privacy built (O8); app-lock **not verified** | Demo/real badge always visible |
| M22 | Capability status | **Gap**: no visible registry found in this pass | Required by TM-REQ-144 |
| M23 | AI layer | Not built (later, D-C) | Shown as "এই কাজ AI ছাড়া করুন" |
| M24 | Template library | Ready systems (6) built | Choose-a-view chooser (B4) |

### A.4 Contradictions and how I resolved them

| # | Conflict | Resolution (logged in DECISIONS_LOG) |
|---|---|---|
| C1 | Spec §3.4 names journey gates **G-A…G-H**; CLAUDE §2 says user-facing stages are **Stage A–H** and build gates are **G0–G8**, never mixed. | UI shows **STAGE A–H**. "G-A…G-H" in the Spec is treated as an internal id only. The Spec text should be fixed in the next Spec revision (Change Log). |
| C2 | The Preview shows a label "GATE · নিজেকে চেনা" with "ধাপ ২/৮". CLAUDE §2: Home shows Stage A as "১/৮" at start. | Follow CLAUDE for the start state (Stage A, ১/৮). The Preview's "GATE" word is **not** used in user copy, to keep Stage and Gate apart. |
| C3 | Spec §11 lists D-E (theme) as "open, default: brand theme"; CLAUDE §2 says D-E approved as Ink & Paper. | CLAUDE §2 wins (later owner statement). Register should be updated when evidence exists. |
| C4 | Spec §11 says real data is device-only and "not approved" by default; DECISIONS_LOG (25 Oct) records **D-B approved for this device only**. | Design assumes device-only real data is possible. Every screen shows a demo/real badge. Real-entry forms are **not** built yet. |
| C5 | Spec §7 asks for a "গাঢ়/প্রিমিয়াম" look; the Preview default is light paper. | Ink & Paper ships light by default with a full dark theme (prefers-color-scheme). Premium feel comes from type, rules and motion, not from a dark default. |

### A.5 Design dependencies
- Stage-gate exit rules → what the Journey can show as "next" (must be computed, not guessed).
- Unknown ≠ 0 rule → every numeric slot needs an "unknown" state in the UI (not a blank).
- Deen privacy rules → no Deen content on Today, notifications or the lock screen (O8).
- Reality-changed loop → needs PlanVersion and diff data (exists per O6).
- Capability status (M22) → every screen should carry a "built / demo / offline / needs internet" tag. This is missing and is the largest UI gap.

---

## Phase B — Information architecture

### B.1 Navigation (bottom bar, 5 tabs — matches `src/app.ts` TABS)

| Tab | Job the user hires it for | Contains |
|---|---|---|
| **আজ (Today)** | "What do I do now?" | One-focus card, next 1–3 actions, current stage, "পরে কী" (collapsed), Ramadan/prayer slot if the user adds one |
| **যাত্রা (Journey)** | "Where am I on the path?" | Stage ladder A–H, horizon arc (today · month · year), North Star metrics, gate log, plan history |
| **ডায়েরি (Diary)** | "What happened / what should I capture?" | Capture, intake forms with Wikipedia suggestions, reality-changed entries, notes |
| **দ্বীন (Deen)** | "My private worship and Akhirah record" | Prayer log, Quran activity, fasting, giving — private, unscored, no ranking |
| **আরও (More)** | "Everything else" | Money, Time & tasks, Habits, Focus, Cards, Topics, Glossary, Ready systems, Data & consent, Settings |

Why these five: Today is the default (DP-03). Journey is the reason the app exists (DP-04). Deen is a separate tab because it must stay private and must not sit inside the money or progress views (Spec §9). More holds the long tail so the bar stays at five (thumb reach, 360 px).

### B.2 Global elements (same on every screen)
1. **Top line:** date · online / offline / sync state (Spec §7).
2. **Mode badge:** "ডেমো ডেটা" or real-on-device, always visible.
3. **Language switch:** EN / বাংলা / মিশ্র (Bangla keeps common English words).
4. **Capability tag** on each module's header (built · demo · offline · needs internet · not built). *Gap in code — see Phase E.*
5. **Bottom bar** with 56 px+ targets.

### B.3 Key journeys (entry → completion)

| Journey | Steps | Ends in |
|---|---|---|
| J1 First open | Empty start → 2 Stage-A tasks → "অজানা থাকলে পরে" | Today shows Stage A ১/৮ |
| J2 Daily | Today → 1 task → done → small stage progress | Back to Today, nothing else shown |
| J3 Gate pass | Last Stage-A task → Gate-passed screen → log entry → next gate opens | Journey shows Stage B |
| J4 Reality changed | Diary › "বাস্তবে বদল" → event → impacts → up to 3 options → diff → approval | New PlanVersion; old one kept |
| J5 Stuck / overload | Today › "আটকে গেছি" → 4 calm choices (Pause · Minimum week · Reduce scope · Resume) | A smaller plan; no red copy |
| J6 Deen daily | Deen tab → one prayer slot → log → quiet consistency line | Stored locally; nothing shared |
| J7 Research | Intake field → "পরামর্শ" → 2–3 cards with source + date → save / own / reject | Chosen option saved; "own" always available |

### B.4 Empty, incomplete and changed-circumstance states
- **Empty start:** no fake data in the real namespace. Demo screens say "ডেমো".
- **Incomplete profile:** path suggestions carry "প্রাথমিক/অসম্পূর্ণ" label (Spec §3.1).
- **Missing number:** show "অজানা" with the field's "why it matters" line, never 0.
- **AI off:** every AI row shows "এই কাজ AI ছাড়া নিজে করুন বা পরে চালু করুন" (Spec §5).
- **Changed circumstances:** the Reality loop is one tap from Today ("কিছু বদলেছে?").

---

## Phase C — Content-driven design direction

### C.1 Pattern per module (and why it fits the content)

| Module | Pattern | Why this fits the content |
|---|---|---|
| Today | **Command card**: 1–3 numbered actions, one stage bar, progressive disclosure below | DP-03 "এক সময়ে একটা ফোকাস"; TM-REQ-171 |
| Journey (stages) | **Vertical stage ladder** A–H; only the current stage is strong; later stages are dimmed and say "খোলা হবে যখন…" | Stage-gates are sequential; a ladder shows order without a percentage |
| Journey (horizon) | **Arc with three markers** (today · month · year), text equivalent below | Matches batch 8/9 idea; shows horizons as levels of one goal (B2) |
| Gate passed | **Achievement moment**: before → after, journey-log entry (what I did · time · what I learned), next gate opens | DP-04; TM-REQ-166; no points, rank or confetti shame |
| North Star | **Metric row**: 3 metrics side by side, each "baseline: unknown" until entered | Spec §3.2 / X1: never collapse to one % |
| Milestone ladder | **Stepped list** with arithmetic steps only | "হিসাবের ধাপ, পূর্বাভাস নয়" (Spec §3.2) |
| Goal tree | **Outline tree** Goal → Sub-goal → Project → Task | TM-REQ-037; text-first for TalkBack |
| Path / library | **2–3 option cards**: fit reason · what's needed · risk · first test · "unknown" line · source + date | TM-REQ-146: fewer than 2 options = do not show |
| Assessment | **One question per screen**, with "জানি না / পরে / প্রযোজ্য নয় / বলব না" always | DP-05; TM-REQ-010, 021, 067 |
| Readiness map | **Four-state list** (জানা · নেই · পুরোনো · দ্বন্দ্ব) — a grid if it helps | Spec M18; simpler than a radar chart |
| Finance | **Ledger table first**, 90-day cash-flow chart second; ESTIMATE / FACT label on each figure | Numbers need labels; unknown must not look like zero |
| Reality changed | **Four-step flow** (event → impact → up to 3 options → approval) with a **plan diff** | Spec §3.6; old plan never overwritten |
| Stuck / overload | **Four calm choices** + optional "where my time goes" list (text first) | B7/B8; no shame copy |
| Deen | **Own workspace**: quiet consistency line, no score, no streak, no leaderboard | DP-12; Spec §9 |
| Ventures | **Card list**: ownership %, unit economics, "unknown" pills | M09; TM-REQ-142 (any industry) |
| Team | **Role-gap list** | M10 |
| Plan flow (B9) | **Connected cards with drawn arrows** (not one SVG), so each node is selectable | Canvas rule: one SVG = one block; cards keep TalkBack order |

### C.2 Shared design system (one system, modules may differ)
- **Tokens:** Ink & Paper from `docs/spec/TM_Theme_Preview_Ink_and_Paper.html` — paper `#F5F1E8`, ink `#14181F`, primary `#243B6B`, ember `#B0431A` (current), moss `#3F6B4A` (done), demo `#73580F` on `#F1E6C4`. Dark set from the same file.
- **Type:** Fraunces (numbers, short English headings) · Noto Serif Bengali (Bangla headings) · Hind Siliguri (body, 16–17 px). Fonts bundled (zero network calls, per CLAUDE §2).
- **Touch:** 44 px minimum, 52 px primary buttons, 56 px tab bar.
- **Contrast:** body text ≥ 4.5:1 in both themes. Muted grey labels are used only for secondary text.
- **Colour meaning:** ember = "now" · moss = "done" · demo gold = "demo". **Red is not used for missed goals** (CLAUDE §6). Danger uses ember in dark mode.
- **Motion:** step done → arrow draws, star appears (B5). `prefers-reduced-motion` = no motion, same meaning.
- **Icons:** stroke only, with a text label. No emoji. No third-party brand marks (Spec DP-11).
- **Islamic styling:** none on non-Deen screens (brief §4). The Deen tab uses the same tokens and no ornament.

### C.3 Guardrails carried into the design (non-negotiable)
No streak, rank, grade, score or shame copy · unknown ≠ 0 · no guaranteed returns · missed goal = calm "পথ বদলাই" option · overload adds no tasks · demo never looks like real.

---

## Phase D — Interactive design (visual prototype)

**Prototype:** https://claude.ai/artifact/TgMksE7TrM9MnxKpcd2cxP — four 390 × 844 phone frames on one canvas, static (no state, no store):

| Frame | Shows | Guardrail in the frame |
|---|---|---|
| Today | Stage A ১/৮, 2 tasks, "নামাজের সময়: এখনো সেট নেই", collapsed "পরে কী" | Demo badge; no streak; unknown prayer time is shown as unknown |
| Journey | Horizon arc + A–H ladder + 3 North Star metrics with "বেসলাইন: অজানা" | No single %, no prediction, a note that a one-year picture needs a baseline |
| Gate passed | Achievement, before/after, journey-log entry, next gate | "ডেমো উদাহরণ" on numbers; no points, no confetti shame |
| Reality changed | Event → impact (with an unknown) → 3 options → "আগের পরিকল্পনা রাখা হবে" | Old plan kept; approval before any change |

**What the prototype is not:** not connected to IndexedDB, not the real app, not a test. It is a visual and copy review tool. Bangla copy is draft and unreviewed (TM-TST-161).

**Not yet prototyped (design written in Phase C, to build next):** Deen tab, Stuck/overload, Assessment question screen, Finance ledger, Plan-flow diagram, Capability-status header.

---

## Phase E — Validation

### E.1 Requirements → design traceability (G1 first-gate rows)

| Req | Requirement (short) | Design answer | Evidence now |
|---|---|---|---|
| TM-REQ-171 | One-focus home | Today command card | Prototype frame "Today" (visual only) |
| TM-REQ-166 | Stage-gate achievement, log, non-punitive | Gate-passed frame | Prototype frame (visual only) |
| TM-REQ-145 | Next-step / missing-info guide | "পরে কী" + "অজানা" lines | Visual only |
| TM-REQ-067 | Progressive disclosure, completeness | Collapsed sections, stage bar | Visual only |
| TM-REQ-021 | Unknown / N-A / decline states | "অজানা" everywhere a number is | Visual only; no test |
| TM-REQ-004 | No guaranteed wealth or returns | Journey footnote | Copy only |
| TM-REQ-006 | Separate fact / estimate / inference | "উদাহরণ", "ডেমো", label row | Partial (labels shown, not full set) |
| TM-REQ-065 | Connected diagrams, not posters | Arc + ladder + reality diff | Visual only |
| TM-REQ-068 | Text equivalent for every visual | `aria-label` on bar, arc, stage | Built in prototype markup; needs TalkBack test (device) |
| TM-REQ-069 | Bangla/English quality | Bangla copy in all frames | **Not verified** (TM-TST-161 owner review) |
| TM-REQ-169 | Phone-first, PC-ready | 390 px frames, one column | Visual; PC layout not designed |
| TM-REQ-100 / 114 | Deen first-class, private, unscored | Deen tab designed in Phase C | **Not prototyped** |
| TM-REQ-143 | Demo isolated from real | Demo badge on every frame | Visual only; isolation is code (see DECISIONS_LOG D-B) |
| TM-REQ-144 | Capability status visible | Header tag in B.2 | **Gap** — not in prototype or in code found |

### E.2 Missing modules in the prototype
M01 profile · M02 assessment · M03 North Star setup · M04 path library · M07 finance ledger · M08 time · M09 ventures · M10 team · M11 research cards · M13 Deen · M14 health · M15 risk · M16 review · M17 knowledge · M19 automation · M20 sync/backup · M21 app-lock · M22 capability · M23 AI (later) · M24 templates. Most are designed in Phase C; none is prototyped yet.

### E.3 Invented assumptions (flagged)
- Demo numbers in the Gate frame ("১ ঘণ্টা ২০ মিনিট", "৩টি দক্ষতা") are **invented demo values**, labelled "ডেমো উদাহরণ". They must not be copied into the real app as defaults.
- "STAGE A" with 8 stages is from Spec §3.4 (8 gates). The stage **names** (নিজেকে চেনা, ভিত্তি গড়া, ছোট পরীক্ষা) are my draft wording, not owner-approved.
- Fraunces and Hind Siliguri are the Preview's choices; their use as final type is assumed.

### E.4 Unnecessary complexity avoided
No radar chart, no 3D, no gradient wash, no emoji, no Islamic ornament outside Deen, no streak flame, no confetti. The horizon arc is the only "decorative" diagram and it carries information (three horizons).

### E.5 Inconsistencies still open
1. Spec §3.4 "G-A…G-H" vs CLAUDE "Stage A–H" (C1) — Spec text to fix.
2. Preview "GATE" label vs CLAUDE "Stage" (C2) — Preview to update.
3. Register xlsx not checked; statuses here are unverified until someone reads it and links test artifacts.
4. M22 (capability status) is required by TM-REQ-144 and is not visible in code found in this pass.

### E.6 What I did NOT verify
- I did not run the app, the unit tests, or the e2e suite in this pass. The design is documentation + a visual prototype.
- I did not open the Register xlsx.
- Bangla wording is not reviewed by a native reviewer.
- No device test (TalkBack, 200% font) has been run.

---

## Suggested skills for the next block (the user asked for real skills)
- `design:accessibility-review` — check the four frames and the Deen tab against text equivalents, contrast and TalkBack order before G2.
- `design:ux-copy` — review Bangla and English copy for calm, non-punitive tone (CLAUDE §6).
- `design:design-critique` — critique the prototype once the Deen and Stuck frames exist.
- `dataviz` — for the finance chart and horizon arc (palette, labels, no misleading scale).
- `zizi-skills:design-guide` — a second opinion on the token set before it goes into `src/ui/styles.css`.
- **Token-optimization:** no skill named `Token-Optimization` exists in this session. The closest is `pith:pith` (token compression). Not invoked in this pass. Tell me if you want it installed or enabled.
