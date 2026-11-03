# Multi-goal: B's author on Proposal A

Voice: the author of Proposal B, writing honestly. Judge: see `multi-goal-final-decision.md`.

## বাংলা সারাংশ

- A-র শক্তি: M12 snapshot-এর সত্য ধরেছে, hand-over গোপনীয়তা ভেবেছে, orphan/মুছে-ফেলার প্রিভিউ বিস্তারিত।
- A-র দুর্বলতা: মূল লক্ষ্য + "এটিও সাহায্য করে" ভাগ মালিকের কাছে অকারণ প্রশ্ন; মোট % সূত্র বাড়তি জটিল; নতুন entity, ৪টি নতুন ফিল্ড, তুলনা কার্ড, split, per-goal weighting — মালিক চায়নি। ২টি সত্য উৎস (links.goal + edge)।

## 1. What I concede (A is right)

1. **M12 snapshots carry no links.** I wrote that versions store task values. Wrong: `SnapTask { id, title, state }`, `Snapshot.v: 1`. A is right that snapshot v2 is needed and that v1 must stay readable with "unknown, not removed".
2. **My "in-play" filter changes today's overall.** Excluding tasks whose goals are all paused or retired moves a number the owner already trusts. Drop it.
3. **Goal percent is count-based today.** My size-weighted per-goal figure would break "5 of 8 steps" matching the ring. Keep goal percents count-based; the global switch only affects the overall.
4. **Hand-over is third-party.** Goal names should print only on a tick.
5. **Dangling ids must not be silently dropped.** A plain repair row is better than "dropped on next save".
6. **A's delete-goal preview** (how many steps keep another goal, how many become unlinked) is a good touch. Adopt it.
7. **A's tests list** for the migration (v1 fixture, newer record untouched, snapshot first) and "overall never changes when links are added" property are good. Adopt.
8. **A noticed the stale audit** (the tree is used) and the `homeCounts`/`universeData` double count. Adopt both.

## 2. Where A is wrong or heavy

1. **Primary versus also-helps is the wrong question to put to the owner.** He said one task helps 2 or 3 goals. A makes him choose a main one, and a second control to add the others, and a third checkbox for split credit. That is three decisions for one tap. It also stores an implied rank of his own goals, which the charter treats as a risk.
2. **The overall formula is invented and unnecessary.** `overallByMainGoal` (groups per root, `n_R * f_R`, mixed weightings) is a new formula to explain. The existing `overallProgress` already counts each task once, linked or not. Adding extra links cannot change it. A's own property test ("overall never changes when an also is added") proves the old function was enough. Removing the function removes the risk.
3. **Two sources of truth.** The main goal lives in `links.goal`; the extras live in separate `goal_link` records. A says one-source-for-each-fact, but a read of "all goals for this task" needs both, every reader must merge them, and the three states (missing main + existing edges, main equals an edge, edge to a deleted goal) each need repair rules. A needs `integrityIssues`, promotion rules and a repair row in Settings > Data because of this shape.
4. **New entity cost.** `goal_link` needs: entity registration, family, privacy class, deterministic ids, namespace rule, CSV import acceptance, backup acceptance, "Clear real/Clear demo" handling, orphan edges, and delete cascades from both task and goal deletion. All of that to store what a list field stores for free.
5. **Four new fields (`goal.weighting`, `task.credit`, `task.energy`, `goal.budget_bdt`) the owner did not request.** Each needs catalog text in EN and BN, a form control, a reachable output (the field_reach test), and a lifetime of support. `task.energy` and `goal.budget_bdt` exist only to feed a comparison card.
6. **Comparison card.** Even "user numbers only" it puts goals side by side. Three goal cards on one screen already do that for progress. A card of minutes, money and energy invites the "which goal costs more or is behind" reading the charter forbids. The shared-minutes second line is a patch for a double count the card itself creates.
7. **Per-goal weighting at creation.** It makes a shared step weigh differently in each goal and forces A's new overall formula. The owner asked for "progress updates automatically", not a weighting menu per goal. Also `goal.weighting` next to `goal.progress_mode` (auto/manual) is two settings with confusingly similar names.
8. **Split credit** divides a step 1/k across goals: an invented fraction, and it makes "3 of 8 steps done" untrue on the card. Full credit is the plain meaning of "I touch this for both".
9. **Promotion rules on removal** ("the oldest also by created_on becomes main") are surprising behaviour the person never asked for; it changes the main goal silently.
10. **The new route** `#/journey/goals/<id>` duplicates the existing goal page `#/journey/goal/:id`, which already shows one goal's tree. A reinvents it and adds router/precache work.
11. **Build order puts the comparison card and habits at the end but ships `goal_link` and the weighting first.** The riskiest, least-asked parts come before the visible value (chips and the picker).
12. **12 commits, UI-heavy, with the formula change at commit 3.** The owner sees nothing until commit 4. B's steps 1 to 5 are invisible but safe; A's step 3 changes the number the owner sees.

## 3. Bottom line from B

A's engineering care (M12 v2, hand-over privacy, delete preview, migration tests, integrity thinking) is worth keeping. A's data shape (main + edges), overall formula, extra fields, split credit, weighting and comparison card are not. Take B's single flat list, keep goal percent count-based, leave the overall alone, and import A's M12, privacy, delete and test work.
