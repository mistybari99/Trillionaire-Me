# Trillionaire Me — G1 Handoff Brief for Claude Code (v1.0)

**Gate:** G1 — Safe shell + field catalog. **Input of record:** `Trillionaire_Me_Canonical_Spec_v2_0.md` and `Trillionaire_Me_Requirements_Register_v2_0.xlsx` (G0 frozen by owner, 22 Oct 2026). If anything here conflicts with the Spec, the Spec wins.

## 0. Ground rules (read first)
1. Synthetic/demo data only. No real personal, financial or Deen data. Demo lives in a separate namespace and can never be promoted to real (TM-REQ-143).
2. Do not touch any existing business system, ERP or credentials (TM-REQ-127).
3. No AI, no network calls, no paid service, no external integration in G1.
4. Phone width first (360 px), Bangla + English, offline-capable shell. PC layout later reuses the same data.
5. Unknown ≠ 0: every numeric field supports unknown / later / not applicable / prefer-not-to-say (TM-REQ-021).
6. Never claim a requirement is implemented without a linked test artifact (TM-REQ-121). Update Register status only from real evidence.
7. Deen: first-class, private by default, no piety score, rank or leaderboard, no fatwa (TM-REQ-100, 114). G1 builds schema and privacy only, no scripture text.
8. Decisions D-A..D-E are UNAPPROVED defaults. D-E (UI theme) is needed for visual design: ask the owner before styling; build theme tokens so any theme drops in. Technology default (D-A): PWA-first in portable TypeScript; if you propose otherwise, record why.

## 1. G1 deliverables
1. App shell with all module slots (empty), navigation, One-Focus Home on demo data (today's 1-3 actions + current gate only; TM-REQ-171).
2. Field catalog (versioned): every field has label, help (what/why/example/format/importance), privacy class, purpose, access rule, allowed unknown states, Bangla + English text (TM-REQ-066, 092, 154, 161).
3. Schema skeletons: profile/assessment (interests, strengths, values, skills with evidence, resources, constraints), goals/tasks hierarchy, venture/asset registry (business-neutral, zero industry-specific fields; TM-REQ-142), habits, finance basics, Deen entities, journey log/gate-pass records.
4. Capability Status registry visible in UI: implemented / demo / offline-ok / internet-needed / not-built per module (TM-REQ-144).
5. Label system FACT / ESTIMATE / INFERENCE / EXTERNAL / DEMO on every value (TM-REQ-006).
6. Guided progressive intake with completeness indicator and next-step guidance (TM-REQ-010, 067, 145).
7. Safety rails: secret-pattern rejection (TM-REQ-034), advice-boundary notes (TM-REQ-151, G3 gate for content; stub in G1), no-guarantee copy (TM-REQ-004).
8. Accessibility baseline: text equivalent for every visual, TalkBack-readable (TM-REQ-068).

## 2. Requirements whose first needed gate is G1 (51)
| Req | Requirement | R | Must pass before | Test | Blocked by |
|---|---|---|---|---|---|
| TM-REQ-001 | Define what “Trillionaire” means for each target | R0 | G3 | TM-TST-001 (auto) |  |
| TM-REQ-002 | Keep multiple north-star outcomes separate | R0 | G3 | TM-TST-002 (auto) |  |
| TM-REQ-003 | Respect the user's value hierarchy, including Deen/Akhirah | R1 | G3 | TM-TST-003 (auto) |  |
| TM-REQ-004 | Do not guarantee extreme wealth, investment returns or success | R0 | G3 | TM-TST-004 (red-team) |  |
| TM-REQ-006 | Separate facts, estimates, assumptions, inferences and external evidence | R0 | G1 | TM-TST-006 (static-scan) |  |
| TM-REQ-010 | Progressive guided intake, not one giant form | R1 | G1 | TM-TST-010 (usability) |  |
| TM-REQ-011 | Personal identity, locale and time settings | R1 | G2 | TM-TST-011 (auto) |  |
| TM-REQ-012 | Education, experience and credentials | R1 | G3 | TM-TST-012 (auto) |  |
| TM-REQ-013 | Skill inventory with proficiency and evidence | R1 | G3 | TM-TST-013 (auto) |  |
| TM-REQ-014 | Interests, values, preferences and constraints | R1 | G3 | TM-TST-014 (auto) |  |
| TM-REQ-015 | Time availability, energy, obligations and calendar | R1 | G3 | TM-TST-015 (auto) |  |
| TM-REQ-016 | Family/care responsibilities and professional network | R1 | G3 | TM-TST-016 (auto) |  |
| TM-REQ-017 | Health and mental well-being context is optional and bounded | R1 | G1 | TM-TST-017 (auto) |  |
| TM-REQ-018 | Devices, connectivity, literacy and access constraints | R1 | G2 | TM-TST-018 (device) |  |
| TM-REQ-021 | Unknown/not applicable/decline-to-answer states | R0 | G1 | TM-TST-021 (auto) |  |
| TM-REQ-022 | Asset/liability and net-worth inventory | R1 | G3 | TM-TST-022 (auto) |  |
| TM-REQ-023 | Income/expense and 90-day cash-flow review | R1 | G3 | TM-TST-023 (auto) |  |
| TM-REQ-024 | Budget templates are configurable, not universal | R1 | G3 | TM-TST-024 (auto) |  |
| TM-REQ-025 | Four-account money routing is optional and editable | R1 | G3 | TM-TST-025 (auto) |  |
| TM-REQ-028 | Separate personal and business cash/working capital | R1 | G3 | TM-TST-028 (auto) |  |
| TM-REQ-031 | Business valuation and ownership percentage | R1 | G3 | TM-TST-031 (auto) |  |
| TM-REQ-034 | Do not collect bank passwords, OTPs or recovery secrets | R0 | G1 | TM-TST-034 (static-scan) |  |
| TM-REQ-036 | Capture life vision across domains | R1 | G3 | TM-TST-036 (auto) |  |
| TM-REQ-037 | Decompose Goal → Subgoal → Project → Task | R1 | G3 | TM-TST-037 (auto) |  |
| TM-REQ-038 | Support SMART/BHAG and free-form goals without forcing a framework | R1 | G3 | TM-TST-038 (auto) |  |
| TM-REQ-044 | Journal/voice notes are optional and sensitive | R1 | G7 | TM-TST-044 (static-scan) |  |
| TM-REQ-065 | Build connected diagrams/cards, not static poster images | R1 | G3 | TM-TST-065 (auto) |  |
| TM-REQ-066 | Every field explains what/why/example/format/importance | R1 | G1 | TM-TST-066 (usability) |  |
| TM-REQ-067 | Use progressive disclosure and completeness indicators | R1 | G1 | TM-TST-067 (usability) |  |
| TM-REQ-068 | Provide form and text equivalents to every visual flow | R1 | G2 | TM-TST-068 (device) |  |
| TM-REQ-069 | Bangla/English quality and local conventions | R1 | G2 | TM-TST-069 (human-review) |  |
| TM-REQ-070 | Android-first, small screen, low bandwidth and optional desktop | R1 | G2 | TM-TST-070 (device) | D-A |
| TM-REQ-072 | Keep canonical user data in the application database | R0 | G6 | TM-TST-072 (auto) | D-C |
| TM-REQ-092 | Classify and minimize sensitive and third-party data | R0 | G1 | TM-TST-092 (static-scan) | D-B |
| TM-REQ-093 | Explicit consent by purpose and integration | R0 | G7 | TM-TST-093 (auto) | D-B |
| TM-REQ-100 | Keep Deen/Akhirah as first-class life domain, not a score | R0 | G1 | TM-TST-100 (static-scan) |  |
| TM-REQ-114 | Personal worship records are sensitive and non-punitive | R0 | G1 | TM-TST-114 (static-scan) |  |
| TM-REQ-130 | Research/reference images are conceptual, not authoritative evidence | R1 | G1 | TM-TST-130 (process) |  |
| TM-REQ-142 | Venture & asset portfolio registry (any number, any industry) | R0 | G3 | TM-TST-142 (auto) |  |
| TM-REQ-143 | Demo/sample data isolated from real profile | R0 | G1 | TM-TST-143 (auto) |  |
| TM-REQ-144 | Capability Status registry visible in UI | R0 | G1 | TM-TST-144 (auto) |  |
| TM-REQ-145 | Next-step and missing-info guide | R1 | G3 | TM-TST-145 (usability) |  |
| TM-REQ-146 | Research action contract (consent, <2 options, own option) | R0 | G4 | TM-TST-146 (auto) |  |
| TM-REQ-154 | Extensibility: new domains/fields without rebuild | R1 | G3 | TM-TST-154 (auto) |  |
| TM-REQ-156 | Retention vs deletion reconciliation | R0 | G7 | TM-TST-156 (auto) | D-B |
| TM-REQ-158 | Visual component catalogue (data-bound) | R1 | G3 | TM-TST-158 (usability) |  |
| TM-REQ-161 | Bangla glossary and field-help library | R1 | G1 | TM-TST-161 (human-review) |  |
| TM-REQ-166 | Stage-gate achievement, journey log, non-punitive motivation | R1 | G3 | TM-TST-166 (usability) |  |
| TM-REQ-169 | Phone-first design with PC-ready architecture | R1 | G2 | TM-TST-169 (device) |  |
| TM-REQ-170 | Public/any-goal edition readiness (templates, achievements) | R2 | G3 | TM-TST-170 (auto) |  |
| TM-REQ-171 | One-focus home: next 1-3 actions only | R1 | G3 | TM-TST-171 (usability) |  |

Full test text for each is in the Register sheet **Tests v2**. Some rows list a later must-pass gate (G2/G3/G7): in G1 build the structure and the test harness for them; final proof is due at the stated gate.

## 3. Definition of done for G1
- Every row above has a linked test artifact (automated where method = auto/static-scan; screenshots/video for device; recorded sessions for usability).
- Empty-start test passes: a fresh install has no demo or real data in the real namespace.
- Demo→real promotion is impossible (test).
- 100% of fields have help + privacy class + Bangla/English text (script report).
- Screenshot report of every screen at 360 px in Bangla and English.
- Register updated with Verified status only where evidence exists; everything else stays "Not verified".

## 4. Out of scope for G1 (do not build)
Offline sync/conflict/backup (G2), planner and finance maths (G3), web research (G4), scripture/prayer-time content (G5), AI/automation (G6), privacy legal review and real data (G7), PC/public edition (G8).

## 5. Report back
After each work block: what changed, which TM-REQ/TM-TST IDs now have evidence, what failed, what needs an owner decision. Do not ask for personal data.
