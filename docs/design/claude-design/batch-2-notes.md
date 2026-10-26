# Claude Design batch 2 — reading notes

Read on 26 Oct 2026. Files: `docs/design/claude-design/batch-2/`. Proposals only; Spec > Register > Brief > Preview still wins. The concept board image the owner pasted (one sheet with 9 panels) is described in §2; the image itself is not stored in the repo.

## 1. Files

| Item | What it is |
|---|---|
| goal-set-method | A SMART funnel diagram (Specific, Measurable, Achievable, Relevant, Time-bound → committed goal) and one hand sketch (`.napkin`). Built from the owner's description. |
| broadsheet | A "newsprint" design system (serif on paper, cyan/magenta spot colour, no boxes). Component pages and templates. Large photos omitted. |
| emblems-3d | Three.js viewer page, plus the 3D logo model: `trillionaire-me-1.obj` and `.glb` (8 parts: obsidian base and pillar, champagne-gold M stems/diagonals, T bar, inlay). |

## 2. The pasted concept board (9 panels)

Panels: cover with phone splash; Home dashboard; Goal Universe; Wealth & Business Intelligence; mobile Home; Create Profile; Deen & Akhirah; Opportunity Research; Design System (Obsidian #0B1216, Champagne Gold #C9A96E, Emerald #1B6F57, Charcoal, Ivory, Grey; Plus Jakarta Sans + Inter; light and dark).

Good ideas to build (new or improved):
1. **Goal Universe** — life areas (Business, Career, Health, Family, Travel, Personal, Deen) around one centre goal, with sub-goals / projects / tasks counts. Needs a list view with the same data.
2. **Home dashboard cards** — four summary cards (net worth, income, expenses, goal progress), Today's Priorities, Goal Progress bars, Recent Updates. Show Unknown when there is no data.
3. **"Next Best Action" card** — one rule-based suggestion with a "View Plan" button. Rule-based only; must show why.
4. **Create Profile wizard** — "Step 2 of 5" with a progress bar. Matches the Diary/intake. Add Skip / Prefer not / Later.
5. **Deen & Akhirah list** — Salah, learning, Ramadan, Zakat, Hajj/Umrah, Family. Private, tracking only.
6. **Opportunity Research** — search box, filters (Business / Skills / Market / Investment), cards with Save / Compare / View Details. Maps to the Topics and own-options cards.
7. **Wealth charts** — net-worth line, asset donut, monthly cash-flow bars. We already have charts with text equivalents.
8. **Animated reward / progress ring** — ring that draws in, soft glow on milestone. Keep short and reduced-motion safe.
9. **Goal Set Method (SMART) funnel** — we already have a SMART guide; the funnel picture can replace our text-only version.

## 3. Conflicts (must fix before any build)

| # | Panel | Conflict | Default fix |
|---|---|---|---|
| D1 | Home, Wealth | Invented figures: $48,750, 68%, 72%, "↑12% this month", $4,320 revenue, asset split percents. Also USD; app uses BDT. | Show only the user's own entered data, otherwise "Unknown". Sample figures only with a DEMO badge, in BDT. |
| D2 | Home "Next Best Action" | "Reinvest 20% of your profit" is financial advice with a made-up number. | Rule-based card with a reason and no invented percent. |
| D3 | Opportunity Research | Market Size $2.5B, Growth 12%/year, Est. Investment $5K–$20K, "High Potential" label are invented facts. | Remove numbers and the label. Show only sourced or own entries, with FACT / ESTIMATE / EXTERNAL tags. |
| D4 | Home | "Sync: Online" and cloud sync. Not approved (D-C, sync). | Replace with "Saved on this device". |
| D5 | Home, Goal Universe | One overall "68% progress" ring. The spec warns against one trillion-progress % before a north-star definition. | Per-goal progress only (already built); no single overall score. |
| D6 | Goal Universe | Graph is visual only. Spec requires a non-visual equivalent. | Provide a list view with the same content. |
| D7 | Deen & Akhirah | "Quran Learning" implies scripture content. D-D not resolved. | Label as a plan/reminder only. No text of scripture. |
| D8 | Typography | Plus Jakarta Sans and Inter do not cover Bangla. | Keep Hind Siliguri / Noto Serif Bengali for Bangla; bundle any Latin face locally. |
| D9 | Emblems page | Loads three.js from unpkg at runtime. Our app has zero network calls. | Do not ship a 3D viewer. If a 3D logo is wanted, use a pre-rendered image or a small bundled SVG. |
| D10 | Palette | Fourth palette (dark emerald / champagne). | Include as a Design version option; owner decision still open (see batch-1 Q1). |

## 4. Technical facts

- The 3D model has 1,188 vertices and the GLB is 47 KB. That is small enough to bundle, but a runtime 3D engine adds weight. Not recommended for a phone PWA.
- Broadsheet is a separate look (serif, cyan/magenta). Could be a fifth Design version later. Not recommended as default.
- Goal Set Method matches our existing SMART guide; only the visual is new.

## 5. What I did

Stored batch 2 in the repo and recorded conflicts. The app is unchanged.

## 6. Plan toward the 3–4 models

Look options for the Artifact (labels, each with real screens from our app, DEMO tagged):
1. **Light Futuristic** (owner default D-E): light surfaces, indigo/magenta accents, glass cards.
2. **Emerald Obsidian**: dark emerald, champagne accents (from the concept board).
3. **Ink & Paper**: calm, flat, high contrast (existing).
4. **Broadsheet** (optional): editorial serif look.

New functions to build after approval: Goal Universe (with list view), Home summary cards, Next Best Action (rule-based), Opportunity cards polish, reward animations.
