# Claude Design batch 1 — reading notes

Read on 26 Oct 2026. Files are in `docs/design/claude-design/batch-1/`. These are proposals. Source-of-truth order (CLAUDE.md §1) still applies: Spec > Register > Brief > Preview.

## 1. What each zip contains

**design-system (f125d695).** Token and component CSS (Button, Card, Tag, Field, Segmented, Progress, StageHeader, TabBar, InspirationCard, Cover), logo SVG, and a Stage-1 product note. Look is "Ink and Paper": warm paper, navy action colour, square shapes. Rules worth keeping: DEMO badge on sample data, unknown is never 0, no exclamation marks, reduced motion stops animation. The note lists 5 open questions (see §4).

**mobile-scope (807f9315).** Five phone screens: Splash, Home (Today), Roadmap (NOW/NEXT/LATER/HORIZON), Advisor (chat), Ibadah (private daily check-in). Also three logo concepts and an icon set.

**ui-mockups (a70d1d08).** Prototype for Today, Diary, Habits, Journey, Deen, Money, More and Onboarding, in two options each, with English/বাংলা switch and Phone 360 / Desktop toggle. Labels already follow our rules: "Unknown — not 0", DEMO tags, Stage A of 8.

**diagrams-scope (e3cade8a).** Ten diagrams A–J (master map, reality→vision, money, reality-changed loop, Deen, offline/AI, journey) with status tags [C] confirmed, [P] proposed, [X] external, [U] unresolved, [F] future. Useful as a documentation map. Not for the app.

**brand-film (f8249c3e).** Motion engine (`animations-v3.jsx`) and scene file (`tm-scene.jsx`). Easing used: enter = easeOutCubic, draw = easeInOutCubic, pop = easeOutBack. This is for a video, not the app.

## 2. Ideas worth building (new, not in the app yet)

1. **Roadmap view (NOW / NEXT / LATER / HORIZON).** Maps well onto Stage A–H. Show the current stage and the next two; no ranking.
2. **Ibadah check-in as a private daily card.** Prayer dots plus three yes/no halal-livelihood questions. Must stay unscored and private (CLAUDE §2 Deen rule).
3. **Diary "answer at your pace" with Skip / Prefer not / Later.** Matches the unknown-is-not-zero rule. Partly built already; check the labels.
4. **Journey strip A–H** with a "Now / Later" tag per stage.
5. **Micro-animations for rewards.** Use the brand-film easing (pop for reward, draw for a progress line, enter for cards). Keep them short. Turn off with `prefers-reduced-motion`. Add them only to reward moments and key transitions, not every tap.
6. **Theme switch Auto / Light / Dark** on the More screen (already planned as the Design version chooser).

## 3. Conflicts with our rules — must fix before any build

| # | Where | Conflict | Proposed fix (default) |
|---|---|---|---|
| C1 | mobile-scope Advisor | Shows a made-up split "Reserve ৳60,000 / Stock ৳30,000 / Course ৳10,000" for a ৳100,000 investment. This is invented advice with numbers. | Remove. Replace with a rule-based "what the plan says" card that shows DEMO and no amounts. |
| C2 | mobile-scope Advisor | Chat "advisor" implies AI. AI is not approved (D-C). | Do not build a chat. Use rule-based cards only. |
| C3 | mobile-scope Home | "Monthly surplus ৳18,400" and "Focused hours 21/30" are fixed numbers. | Show as DEMO sample, or as "Unknown" until real data (D-B) is approved. |
| C4 | design-system, ui-mockups | "Ink and Paper" tokens. D-E now makes Light / Colorful / Futuristic the default. | Keep as the `classic` option in the Design version chooser. Do not make it the default. |
| C5 | mobile-scope brand, brand-film, diagrams | Three different palettes: Obsidian + Champagne (logo), Modernist grey + red (film/diagrams), Ink and Paper (app). | Owner decision needed (see §4, Q1). |
| C6 | brand concept 1c | Nested arches read as a mosque or doorway. The brief itself says avoid religious iconography. | Reject 1c, as the brand file already does. |
| C7 | brand-film `tm-scene.jsx` | Loads a Google Fonts stylesheet. Our rule: fonts bundled, zero network calls. | Do not copy that line into the app. Use bundled fonts. |
| C8 | ui-mockups Money | "Net worth", "Monthly cash flow" with placeholders. Fine if always DEMO or Unknown. | Keep labels; no computed totals from demo data. |

## 4. Questions for owner (one at a time, with my default)

**Q1 (look):** সিদ্ধান্ত লাগবে: অ্যাপের মূল রঙ কোনটি হবে — Light / Colorful / Futuristic (আপনার আগের নির্দেশ), নাকি ব্র্যান্ডের Obsidian + Champagne, নাকি Ink and Paper? · আমার সুপারিশ: Light / Colorful / Futuristic মূল, Ink and Paper একটি বিকল্প হিসেবে, Obsidian শুধু লোগো ও ডার্ক মোডে · না বললে আমি এটাই ধরে এগোব।

**Q2 (source of truth):** `main` আর `ccr-8b686ba2-vitt45` আলাদা। কোনটি মূল? · আমার সুপারিশ: `ccr-8b686ba2-vitt45` · না বললে এটাই ধরে এগোব।

**Q3 (navigation names):** Command Center / Goal Universe / Wealth / Guided Life / Strategy Lab নামগুলো ট্যাব হবে, নাকি বর্তমান ২৪টি screen থাকবে? · আমার সুপারিশ: বর্তমান screen রেখে শুধু নতুন নামে Roadmap/Journey যোগ · না বললে এটাই।

**Q4 (wider layout):** ট্যাবলেট/ওয়েব লেআউট এখন দরকার? · আমার সুপারিশ: না, এখন শুধু ফোন (480px) · না বললে এটাই।

## 5. What I did with batch 1

- Saved all five packages under `docs/design/claude-design/batch-1/` (no thumbnails, no shared runtime file).
- Recorded the conflicts above.
- Nothing has been changed in the app. The build still shows the current default look.

## 6. Next

- Wait for batch 2 and any remaining files.
- After the batches are read, build 3–4 options in an Artifact, with the owner's approval before anything goes live.
