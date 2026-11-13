# Requirements without automated evidence up to G3 (6 Nov 2026)

Source: `docs/register/Trillionaire_Me_Requirements_Register_v2_1_evidence_refresh.xlsx` (regenerated from the untouched v2_0 and the real run: 2068 vitest tests, 0 failed; 44 of 172 TM-TST rows linked: Pass 14, Partial 30).

**86 requirement rows** with first-needed gate G0-G3 still read "Not verified — no build". Many of these features now exist in the app, but no TM-TST test is linked to them, so the Register is not allowed to call them verified. This list is the input for VERIFY-04 follow-up and BUILD-03; it claims nothing about whether each is built.

| Req | Gate | Requirement (start) |
|---|---|---|
| TM-REQ-001 | G1 | Define what “Trillionaire” means for each target |
| TM-REQ-002 | G1 | Keep multiple north-star outcomes separate |
| TM-REQ-004 | G1 | Do not guarantee extreme wealth, investment returns or success |
| TM-REQ-008 | G3 | Preserve a decision log and plan versions |
| TM-REQ-011 | G1 | Personal identity, locale and time settings |
| TM-REQ-012 | G1 | Education, experience and credentials |
| TM-REQ-013 | G1 | Skill inventory with proficiency and evidence |
| TM-REQ-014 | G1 | Interests, values, preferences and constraints |
| TM-REQ-016 | G1 | Family/care responsibilities and professional network |
| TM-REQ-018 | G1 | Devices, connectivity, literacy and access constraints |
| TM-REQ-020 | G3 | SWOT/TOWS and gap analysis are explainable |
| TM-REQ-024 | G1 | Budget templates are configurable, not universal |
| TM-REQ-025 | G1 | Four-account money routing is optional and editable |
| TM-REQ-026 | G3 | Emergency reserve based on actual obligations/risk |
| TM-REQ-027 | G3 | Debt plan considers cost, due dates and user constraints |
| TM-REQ-028 | G1 | Separate personal and business cash/working capital |
| TM-REQ-029 | G3 | Runway and downside scenarios |
| TM-REQ-031 | G1 | Business valuation and ownership percentage |
| TM-REQ-036 | G1 | Capture life vision across domains |
| TM-REQ-037 | G1 | Decompose Goal → Subgoal → Project → Task |
| TM-REQ-038 | G1 | Support SMART/BHAG and free-form goals without forcing a framework |
| TM-REQ-044 | G1 | Journal/voice notes are optional and sensitive |
| TM-REQ-045 | G3 | Real-life event capture triggers impact analysis |
| TM-REQ-046 | G3 | Preserve historical plan and compare alternatives |
| TM-REQ-057 | G3 | Unit economics, working capital and marginal cost |
| TM-REQ-060 | G3 | Local-to-national scale gate requires repeatability |
| TM-REQ-065 | G1 | Build connected diagrams/cards, not static poster images |
| TM-REQ-068 | G1 | Provide form and text equivalents to every visual flow |
| TM-REQ-069 | G1 | Bangla/English quality and local conventions |
| TM-REQ-070 | G1 | Android-first, small screen, low bandwidth and optional desktop |
| TM-REQ-071 | G2 | Use reminders without intrusive or shaming patterns |
| TM-REQ-072 | G1 | Keep canonical user data in the application database |
| TM-REQ-074 | G3 | Keep model vs code responsibilities explicit |
| TM-REQ-085 | G2 | Offline operation queue uses stable IDs and idempotent replay |
| TM-REQ-086 | G2 | Sync conflicts have visible, safe resolution |
| TM-REQ-087 | G2 | Show freshness, queue, error and last-sync states |
| TM-REQ-090 | G2 | Device loss/account recovery and session revocation |
| TM-REQ-094 | G2 | Access, correction, portability, deletion and withdrawal workflows |
| TM-REQ-096 | G2 | Encryption, secret management and role/data scopes |
| TM-REQ-097 | G2 | Audit logs are useful without leaking sensitive data |
| TM-REQ-101 | G3 | Salah log, methods, time source, timezone and travel state |
| TM-REQ-105 | G3 | Fasting, Ramadan, qada, fidya and kaffara handling |
| TM-REQ-106 | G3 | Zakat calculator shows method, as-of assets and line items |
| TM-REQ-107 | G3 | Zakat al-Fitr is separate from annual wealth Zakat |
| TM-REQ-109 | G3 | Sadaqah, ongoing charity, waqf and Qurbani are distinct options |
| TM-REQ-111 | G3 | Rights/duties: family, debts, promises, staff and customers |
| TM-REQ-112 | G3 | Hijri calendar, Ramadan/Eid and moon-sighting status |
| TM-REQ-115 | G3 | Rest, sleep, family and recovery are capacity constraints |
| TM-REQ-120 | G0 | Audit all unverified statistics and productivity claims |
| TM-REQ-121 | G0 | Requirement IDs link specification to tests and future code |
| TM-REQ-122 | G3 | Model, prompt, rule, schema and data migrations are versioned separately |
| TM-REQ-127 | G0 | Separate Trillionaire Me from existing ERP at first |
| TM-REQ-128 | G0 | Free-first and no purchase/deploy without approval |
| TM-REQ-131 | G0 | Keep source inventory and requirement coverage synchronized |
| TM-REQ-133 | G3 | SOPs, playbooks and knowledge base are linked to goals |
| TM-REQ-134 | G0 | External tools are selected only after capability/cost comparison |
| TM-REQ-136 | G2 | Choose architecture with a real offline prototype |
| TM-REQ-137 | G3 | Support adjustable 30/90/180-day and weekly roadmaps |
| TM-REQ-138 | G3 | Track planned versus actual time, spend and output to learn from history |
| TM-REQ-140 | G2 | Disaster recovery includes export, restore and a tested continuity runbook |
| TM-REQ-141 | G0 | Claims inherited from source material retain evidence status |
| TM-REQ-142 | G1 | Venture & asset portfolio registry (any number, any industry) |
| TM-REQ-145 | G1 | Next-step and missing-info guide |
| TM-REQ-147 | G3 | Cross-goal priority conflict and resource contention |
| TM-REQ-149 | G3 | Team, hiring and delegation planning |
| TM-REQ-150 | G3 | Multi-currency, FX and price basis |
| TM-REQ-152 | G3 | Risk register and stop/kill criteria |
| TM-REQ-154 | G1 | Extensibility: new domains/fields without rebuild |
| TM-REQ-156 | G1 | Retention vs deletion reconciliation |
| TM-REQ-157 | G3 | Health, learning and family goal domains |
| TM-REQ-159 | G0 | Source intake completeness (originals, images, user statements) |
| TM-REQ-160 | G2 | Offline notification/reminder engine |
| TM-REQ-162 | G3 | Freshness of user-entered facts |
| TM-REQ-163 | G2 | Performance and storage budget on low-end phones |
| TM-REQ-167 | G3 | Neutral global opportunity library matched to assessment |
| TM-REQ-168 | G3 | AI-optional: >=80% of core flows work with no AI/network |
| TM-REQ-169 | G1 | Phone-first design with PC-ready architecture |
| TM-REQ-170 | G1 | Public/any-goal edition readiness (templates, achievements) |
| TM-REQ-174 | G3 | 'I'm stuck' problem loop: Identify → Diagnose → Intervene → Execute → Measure |
| TM-REQ-175 | G3 | Rule-based diagnosis of stuck causes; unknown answers never forced into a cause |
| TM-REQ-178 | G3 | Habits use recovery/restart plans; no streak counters or shaming copy |
| TM-REQ-181 | G3 | Quick capture: free note/decision → rule-based extraction of amounts, percents, durations, dates, decisions →  |
| TM-REQ-182 | G1 | Field rules: one fact per field, taps over typing, short text ≤80 chars, every field shows what/why/example/fo |
| TM-REQ-183 | G3 | Topic library: every owner topic (20 + Deen) has short practical tips with a visual; tips share tags so relate |
| TM-REQ-184 | G3 | Reward picture: each finished task adds a star, each passed stage adds a garden layer; milestone moments; no p |
| TM-REQ-185 | G3 | Hideable side drawer listing all topics while the 5 phone tabs stay primary |
