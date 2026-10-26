# Topic coverage audit (26 Oct 2026)

Owner request: no topic may open thin or empty. This file records the audit (before) and the fill (after). Source: `src/library/topics.ts`, `public/content/pack-001.json` to `pack-007.json`.

## Rule for "thin"
A topic is thin if it has fewer than 4 tips, or if it has no steps card, no worked example, or no "common slips" card (the "common mistakes" card; the word "mistake" is on the app's banned-word list, so the card is titled "Common slips" in English and "যেদিকে খেয়াল রাখবেন" in Bangla). Before this change the bundled and pack-001/002 tips had no card kinds at all, so every topic was thin on the second test.

## Audit and result
| Topic | Bundled tips | Pack 001-002 tips | What was thin before | New entries (packs 003-007) | Tips now | All 5 kinds |
|---|---|---|---|---|---|---|
| Self-awareness & identity (`self-awareness`) | 2 | 0 | under 4 tips; no steps card; no example; no common-slips card | 5 | 7 | yes |
| Goal setting & strategy (`goal-strategy`) | 2 | 0 | under 4 tips; no steps card; no example; no common-slips card | 5 | 7 | yes |
| Knowledge & learning (`knowledge`) | 2 | 6 | no steps card; no example; no common-slips card | 5 | 13 | yes |
| Skills & competency (`skills`) | 2 | 0 | under 4 tips; no steps card; no example; no common-slips card | 5 | 7 | yes |
| Decisions & problem solving (`decisions`) | 2 | 2 | no steps card; no example; no common-slips card | 5 | 9 | yes |
| Focus & deep work (`focus`) | 2 | 2 | no steps card; no example; no common-slips card | 5 | 9 | yes |
| Procrastination & starting (`procrastination`) | 2 | 2 | no steps card; no example; no common-slips card | 5 | 9 | yes |
| Habits, discipline & consistency (`habits`) | 2 | 7 | no steps card; no example; no common-slips card | 5 | 14 | yes |
| Emotions & resilience (`emotions`) | 2 | 0 | under 4 tips; no steps card; no example; no common-slips card | 5 | 7 | yes |
| Health, energy & sleep (`health`) | 2 | 5 | no steps card; no example; no common-slips card | 5 | 12 | yes |
| Time & priorities (`time`) | 2 | 8 | no steps card; no example; no common-slips card | 5 | 15 | yes |
| Execution & projects (`execution`) | 2 | 1 | under 4 tips; no steps card; no example; no common-slips card | 5 | 8 | yes |
| Money & resources (`money`) | 2 | 7 | no steps card; no example; no common-slips card | 20 | 29 | yes |
| Communication & relationships (`relationships`) | 2 | 5 | no steps card; no example; no common-slips card | 5 | 12 | yes |
| Environment & systems (`environment`) | 2 | 0 | under 4 tips; no steps card; no example; no common-slips card | 10 | 12 | yes |
| Failure, obstacles & adaptation (`obstacles`) | 2 | 1 | under 4 tips; no steps card; no example; no common-slips card | 5 | 8 | yes |
| Creativity & innovation (`creativity`) | 2 | 2 | no steps card; no example; no common-slips card | 5 | 9 | yes |
| Measurement & reflection (`measurement`) | 2 | 1 | under 4 tips; no steps card; no example; no common-slips card | 5 | 8 | yes |
| Confidence & courage (`courage`) | 2 | 2 | no steps card; no example; no common-slips card | 5 | 9 | yes |
| Life balance & meaning (`balance`) | 2 | 0 | under 4 tips; no steps card; no example; no common-slips card | 5 | 7 | yes |
| Deen, ibadah & akhirah (`deen`) | 2 | 0 | under 4 tips; no steps card; no example; no common-slips card | 5 | 7 | yes |

Summary: 21 topics, 10 had fewer than 4 tips before (most had 2 to 3), 0 had a steps/example/common-slips card. **125 new entries** added; every topic now has at least 5 and opens with 7 or more tips.

## Card kinds (new optional field `kind`)
`explain` (short explanation) / `steps` (practical steps) / `example` (one realistic example, no invented figures) / `watchout` (common slips) / `learn` (where to learn more). A `learn` card also carries `source`: `general` (general knowledge), `wikipedia` (from Wikipedia, saved in background through the existing research feature, no text copied) or `reviewer` (reviewer pending). Every new entry has `reviewer: "pending"`; the Bangla is shown as "যাচাই হয়নি" until a reviewer signs off (TM-TST-161).

## Areas requested by the owner and where they live
| Area | Topic id | Tags to look for |
|---|---|---|
| Money basics and budgeting | money | budget |
| Saving and emergency fund | money | savings, emergency |
| Debt | money | debt |
| Income and small business starting steps | money | income, business |
| Time and planning | time | time |
| Habits and focus | habits, focus, procrastination | habits, focus |
| Learning how to learn | knowledge | learning |
| Health basics (non-clinical) | health | health |
| Relationships and communication (non-clinical) | relationships | communication |
| Career and skills | skills | career |
| Digital safety and privacy | environment | digital-safety |
| Decision making | decisions | decision |
| Goal setting | goal-strategy | goal |

Digital safety has no topic of its own (the topic list is fixed at 21), so it sits in "Environment & systems" with the tag `digital-safety`. A separate topic would need an owner decision.

## Guards (tests/content_pack.test.ts)
All new packs are checked for: schema and parity (Bangla/English), Latin digits only, no URL, no scripture or hadith, no banned shame/grade/streak/rank words (English and Bangla), no percentages, currency, returns, interest, profit or guarantees, no clinical wording, no invented statistics, every topic has all 5 kinds, at least 120 entries, reviewer flag on every entry.

## Honest limits
- The Bangla is plain draft text written by the builder; it needs the reviewer pass.
- Examples use first names and no money amounts; they are illustrations, not case studies.
- "From Wikipedia" notes only point to the existing in-app research feature; no Wikipedia text is stored in the packs.
