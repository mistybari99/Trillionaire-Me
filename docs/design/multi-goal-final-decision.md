# Multi-goal with shared steps: final decision (binding)

Judge ruling on Proposal A and Proposal B and their two critiques. Date 3 Nov 2026. Read-only review of `goalTree.ts`, `goalPlan.ts`, `overallProgress.ts`, `migrate.ts`, `entities.ts`, `realityLoop.ts` and every `links.goal` reader. Nothing is built yet.

Owner need: 3 to 4 big goals, each with its own tree; every action traceable to its goal; one step often helps 2 or 3 goals; each linked goal's progress updates by itself; the app shows where each action goes. Binding: ONE overall % with no double counting, Unknown is not 0, no invented numbers/ranks/scores, no punishing copy, additive migration, nothing lost.

## বাংলা সারাংশ (মালিকের জন্য)

- একটি কাজ ২-৩টি লক্ষ্যে জোড়া যাবে। ফর্মে লক্ষ্যের নামের ছোট বোতাম: ট্যাপ করলে জোড়া, আবার ট্যাপ করলে খোলা। "মূল" বা "সহায়ক" ভাগ নেই।
- কাজ শেষ হলে জোড়া **প্রতিটি লক্ষ্য** পুরো ক্রেডিট পায়। মোট % (overall) আগের মতোই: প্রতিটি কাজ **একবারই** গোনা হয়। লক্ষ্যের % গড় করে মোট বানানো হয় না।
- প্রতিটি কাজের পাশে ছোট চিপ দেখায় কাজটি কোন কোন লক্ষ্যে যাচ্ছে। কাজ খুললে "এটি শেষ হলে কী বদলাবে" সাদা কথায় দেখা যায়।
- পুরোনো ডেটা বদলায় না, কিছু হারায় না। ব্যাকআপ/রিস্টোর ঠিক থাকে।
- বানানো হবে না: লক্ষ্যের তুলনা কার্ড, র‍্যাংক, স্কোর, ভাগ করা ক্রেডিট, ওজন, এনার্জি/বাজেট ফিল্ড।

## 1. Rulings at a glance

| Question | Ruling |
|---|---|
| Data shape | **One flat list on the task**, `task.goals` (B). No `goal_link` entity. |
| `links.goal` | Kept as a **rollback mirror** of the first list item, written only by one writer. Never shown as "main". |
| Which wins if they disagree | `task.goals` wins when it holds a non-empty list. `links.goal` is only a fallback when `task.goals` is absent or unknown. |
| Schema version | **Bump 1 to 2**, with `MIGRATIONS[1]` copying `links.goal` into `task.goals` for tasks. |
| Primary / also-helps | **OUT.** Flat set. Print and chip order is by title, so no goal looks "main". |
| Credit per goal | **Full credit to every linked goal**, from one shared `done_on`. |
| Goal % | Count-based, as today: done steps over distinct counted steps. **No weighting per goal.** |
| Overall % | **Function unchanged.** Still task-based, each step once, device mode equal/size. Never reads goal %. |
| Per-link weight / split credit / per-goal weighting | **OUT.** |
| "In-play" filter for paused goals (B) | **OUT.** Overall keeps today's meaning. |
| Comparison card, `task.energy`, `goal.budget_bdt` | **OUT.** |
| Separate trees | Reuse the existing goal page `#/journey/goal/:id`. No new route. |
| M12 snapshots | **Snapshot v2** with optional `goalIds` per step; v1 stays readable. |
| M10 hand-over | Shows only "serves N goals"; goal names print only on an explicit tick. |

## 2. Why these rulings (where A and B conflicted)

1. **List field, not edges (B).** For a single-user phone app with 3 to 4 goals, a list on the task is the smallest thing that holds the data. A's `goal_link` costs an entity, ids, a checker, orphan-edge repair, extra delete paths and a CSV/backup shape, to store what a list stores. The two-sources-of-truth objection from A against B's mirror is real, so the mirror is made harmless: one writer, a fixed "who wins" rule, and nothing new reads `links.goal` for tasks.
2. **No primary (B).** The owner said "one task helps 2 or 3 goals". A "main goal" question on every task is friction and an implied ranking. A needed a primary only for its own overall formula, which is not needed.
3. **Overall untouched (B).** `overallProgress` loops over tasks, so adding links cannot double count. A's `overallByMainGoal` is rejected: it adds a formula the owner cannot check by eye and solves nothing.
4. **Goal % stays count-based (A's concession, B's too).** `goalProgress` today is done over linked, with no weighting. Keeping it keeps "5 of 8 steps" equal to the ring. A global size weighting for goals would silently change every existing goal figure.
5. **No in-play filter (A).** Pausing a goal must not move the one overall number. Paused/retired behaviour stays exactly as it is today (reminders silent, status shown).
6. **Snapshot v2 (A).** B's claim that snapshots store task values is false; `SnapTask` has only id, title, state.
7. **Hand-over privacy (A).** `handover` is a `third_party` entity; goal titles are personal.
8. **Delete-goal preview and dangling-id visibility (A).** Adopted. B's "dropped on next save" is rejected as silent loss.
9. **No new route (B).** `#/journey/goal/:id` already renders one goal's tree with `buildTree`.

## 3. Data model

### 3.1 Fields (both additive, catalog text in EN and BN, importance "useful", privacy same as the entity)

```
task.goals    entity task    type list    value ["goalIdA","goalIdB"]    unknown/absent = "not linked yet"
habit.goals   entity habit   type list    same shape; a habit is traced to goals, never counted in a percent
```

The list holds goal ids of any level (a goal, a sub-goal or a project). Order is the order tapped and has no meaning in any screen. Max 5 ids (phone limit, polite one-line message, no red). Duplicates removed. Ids must belong to the task's own namespace (demo vs real never cross, D-B).

### 3.2 One reader, one writer (pure, new `src/core/taskGoals.ts`)

```ts
goalIdsOf(rec): string[]            // task.goals if a non-empty list; else [links.goal] if present; else []. Deduped.
liveGoalIdsOf(rec, goalIds): string[]   // only ids that exist in the same namespace; used by maths
danglingGoalIdsOf(rec, goalIds): string[]  // ids that point to a missing goal (kept in data, shown, never silently dropped)
withTaskGoals(rec, ids): TMRecord   // the ONLY writer: sets task.goals (or {state:"unknown"} when empty), mirrors links.goal = ids[0] (removed when empty)
validateLinks(recs, rec, ids): "goals_max" | "goal_other_namespace" | null   // a missing goal id is NOT an error here; it only blocks new picks
```

`links.goal` stays meaningful for notes (`notesUi.ts`, `knowledge.ts`) and onboarding; those are different records and are left alone.

### 3.3 Mirror: kept, for rollback

`links.goal = task.goals[0]` is written for tasks only. Reasons: (a) a v1 build reads the first goal and shows the step under it, nothing breaks; (b) old backups and CSVs still carry a link; (c) undo is "revert the code": data stays valid. Rule against drift: if `links.goal` is not the first item of `task.goals` (an older build edited it), `task.goals` wins and the next save rewrites the mirror. Unknown links are never invented from the mirror.

### 3.4 Schema version: bump to 2

```ts
MIGRATIONS[1] = (r) => {
  if (r.entity !== "task" || (r.values["task.goals"]?.state === "value")) return r;   // idempotent
  const g = r.links?.goal; if (!g) return r;                                          // nothing to copy: stays unknown, not []
  return { ...r, values: { ...r.values, "task.goals": { state: "value", value: [g], label: r.ns === "real" ? "FACT" : "DEMO" } } };
};
```

Never drops a value; `links.goal` stays; id, ns, entity unchanged; runs after the existing `before_migrate` snapshot; a record from a newer app is left alone. `goalIdsOf` also falls back to `links.goal`, so the app is correct even before migration runs (restore of an old backup). The 18 hard-coded `schemaVersion: 1` writers in `src` are first replaced by the exported `SCHEMA_VERSION` constant (its own commit), otherwise every new record would be re-migrated on each load. The fingerprint file and a v1 fixture are updated.

## 4. How progress is credited

Words: a **step** is a task with `isCountedTask` (not "no longer true"). A step is **done** when it has `task.done_on`. Unknown (no steps) is `null`, never 0.

1. **Per goal (own).** `own(G)` = distinct counted steps whose live goal ids include G. `percent(G) = round(done / total * 100)`; `null` when `total = 0`. A step linked to G and to H counts once in G and once in H (full credit to each). Manual-mode goals keep their typed percent; their step count still shows.
2. **Roll-up.** `branch(G)` = the **set union of step ids** of G and all descendants. `done`, `total` and `percent` come from the set, so a step linked to a project and to its parent goal counts once in that branch, and one step linked to two sub-goals counts once in the root. This replaces the `+=` in `buildTree.walk`. `TreeNode` gains `stepIds` (internal) and `own`/`branch` keep their shape.
3. **Fix a latent mismatch.** `goalProgress` today also counts steps marked "no longer true", while the overall excludes them. Per-goal counts now use `isCountedTask`. This is a visible change only for goals with such steps. Record it in `DECISIONS_LOG.md` and the Change Log.
4. **The ONE overall %.** `overallProgress(recs, mode)` is **not changed**. It counts each counted task once, linked or not, in the device mode (equal or size). It never reads goal percents, so no number of links can change it. Below the goal cards, one muted fact line from a new pure `linkStats`: "N steps counted once · M help more than one goal · K are not linked to a goal yet." This is what makes "once in the total" visible.
5. **Why the overall counts each step once.** The overall's unit is the step, not the goal link. Links are a many-to-many index over steps; summing or averaging per-goal numbers would count a shared step per goal. The test suite contains the property: add random links, overall must not change.
6. **Universe/area totals** (`goalUniverse.ts`) and **home counts** (`homeCounts.ts`) dedupe by step id. `GoalProgress` gains `ids: string[]` (internal) so callers can union.
7. **Done is global.** One `done_on` per step. No partial done per goal.
8. **Habits** are traced, never counted. Under each goal a plain line: "Habit: Walk 20 min, 4 of 5 days this week" or "no check-ins yet" (never 0).

### Worked example (equal counts; overall in equal mode)

Steps: t1 {A} done; t2 {A,B} done; t3 {B}; t4 {A,B,C}; t5 {C} done; t6 none.
A = t1 t2 t4 = 2 of 3 = **67%**. B = t2 t3 t4 = 1 of 3 = **33%**. C = t4 t5 = 1 of 2 = **50%**. Overall = 6 steps once, done t1 t2 t5 = 3 of 6 = **50%**. Fact line: "6 steps counted once · 2 help more than one goal · 1 not linked". Finish t4: A 100, B 67, C 100, overall 4 of 6 = 67. Three goals moved from one tap; the overall moved once. Averaging the goal percents (67+33+50)/3 = 50 matches by luck here but fails in general (a goal with 1 step would weigh as much as one with 40); it is not used.

## 5. IN / OUT list

| Item | Decision | Reason |
|---|---|---|
| `task.goals`, `habit.goals` | IN | the whole feature |
| Primary vs also-helps | OUT | extra question, implied rank |
| Per-link weights (60/40) | OUT | invented numbers |
| Split-credit option | OUT | invented fraction; breaks "3 of 8 steps" |
| Per-goal weighting (`goal.weighting`) | OUT | shared step would weigh differently per goal; second setting next to `goal.progress_mode` |
| Device size/equal mode | stays, affects the overall only | existing rule |
| Comparison card | OUT | invites "which goal is behind"; three cards already sit side by side |
| `task.energy`, `goal.budget_bdt` | OUT | feed only the comparison card; not asked |
| "Where this goes" trace | IN | owner asked "show where each action goes" |
| Fact line (counted once / shared / unlinked) | IN | cheap, explains the overall |
| In-play filter for paused goals | OUT | would move the overall |
| New route for one goal's tree | OUT | exists |

## 6. UI flows (360 px, EN/BN/mix, 44 px targets, text not colour alone)

1. **Goals overview** (`#/journey/goals`, Journey card). Order: the existing overall card; the fact line; one card per top-level goal (title, ring or "Not known yet", "5 of 8 steps", and only when relevant "3 steps also help other goals"); a quiet "4 steps are not linked to a goal. Link them." card only when such steps exist (tap opens that list, no red, no count badge); paused goals under one collapsed row. Order by title, never by progress. The new-goal form moves below the cards. 3 to 4 goals = 3 to 4 stacked cards; more is fine (suggest, do not enforce a limit).
2. **Separate trees.** Each card opens the existing goal page. Add a "Steps" section grouped by node (goal, then each sub-goal/project). A shared step appears under every goal it lists with a text chip "Also: Health". Three or four roots are three or four independent trees.
3. **Link picker** (task form and edit, replaces the single `pt-goal` select in `screens.ts`). One row of toggle chips, one per top-level goal that is not retired (a retired goal appears only if already linked); `aria-pressed`; tap = linked, tap again = unlinked. Under a selected chip whose goal has sub-goals/projects, an optional "Which part?" select (default "Whole goal") stores the part's id instead of the root's; two parts of one root are allowed and count once for the root. Helper: "Tap every goal this step helps." With zero goals: "Add a goal first" link. Nothing selected is a normal state. Onboarding keeps its single goal select.
4. **Chips on every step row** (Today, Plan, boards, focus, goal page): up to 2 chips then "+N", title shortened to 14 characters with full title in `title`/`aria-label`; chip taps open that goal page. Retired = "(retired)", paused = "(paused)". No goal: quiet text link "Link to a goal". Chips are information, shown in every mode.
5. **Where this goes** (a small "Where does this go?" section in the step edit sheet): for each goal, the path `Shop > Stock > Launch`, and plain facts "Done adds this step to Shop (3 of 8 becomes 4 of 8) and Learn (1 of 2 becomes 2 of 2)". Pure `taskTrace`, same maths, no advice.
6. **Today.** Rows get chips; a shared step is one row and one slot. Planner unchanged: it takes one `PlanTask` per step, so a shared step is placed once and counted once in capacity. No tasks are ever added by linking. Overload / minimum-week / pause behave as today.
7. **Journey / report.** Goal rings read `branch.percent`. The report adds the fact line. Charts keep "Show as text". Missed goals show no punishing copy; a % that falls after a link or removal uses the existing neutral "a step was added/removed" explanation.
8. **Print / PDF** (`planDoc`). `steps` of a node = steps whose ids include that node. A shared step prints under each goal with "(also: Health)". Goals sorted by title. Overall prints once on top; footer "Shared steps count once in the total."
9. **Hand-over (M10).** Role steps show "serves N goals". Goal names print only if the person ticks "Include goal names" (default off). Delegating keeps the links; when the other person's done date is recorded, every linked goal updates because progress reads the step.

## 7. Delete and unlink rules

| Action | Rule |
|---|---|
| Untap a chip | removes that id from `task.goals`, re-mirrors `links.goal`. Step stays. No confirm (one tap undoes it). |
| Remove the last goal | `task.goals` becomes unknown, `links.goal` removed; the step stays in the overall and shows "Link to a goal". |
| Delete a step | gone from every goal; confirm adds "It also leaves 2 goals" when linked to more than one. |
| Delete a goal | Preview first: "3 steps lose this goal · 2 keep another goal · 1 becomes not linked · 1 part moves up". One confirm. Then the id is removed from every `task.goals` and `habit.goals` in one batch; no step or habit is deleted; the existing `orphan` rule handles children; an automatic M12 plan version records before/after. |
| Retire / pause a goal | links stay, chips grey with the word; reminders silent as today; overall unchanged. |
| Move a part to another parent | steps linked to the part follow it; no rewrite of tasks. |
| Dangling id (partial restore) | kept in data, ignored by maths, the step row shows "a goal that was removed" with one-tap "Remove link". Never silent. |
| Marked "no longer true" | leaves every goal's count in one step; the reality screen names the goals it served. |

## 8. M12 and M10 interaction

- **Snapshot v2.** `Snapshot.v` becomes `1 | 2`; `SnapTask` gets optional `goalIds`. `parseSnapshot` accepts v1 and v2. For v1, missing `goalIds` means **unknown**, so `planDiff` shows no false "link removed". `planDiff` gains a `link` row: "Step X: Shop becomes Shop, Learn" only when both snapshots have `goalIds`.
- **`impactOf`** uses `goalIdsOf(task).includes(scope.id)`; time events collect goals from all links; one new neutral line "This step also helps Learn". Options and the three-option cap are unchanged and still add no task. Reduce-scope or parking a shared step affects each linked goal and the preview names them.
- **Plan versions.** A delete-goal that changes links writes a version. Adding/removing a link on a step writes none (no cost) but appends one line to the journey log.
- **M10.** `links.role` and `task.goals` are separate keys. `assignTask`, `syncDelegation`, `completeHandover` do not touch goals. Hand-over print default hides goal names.

## 9. The stale-audit correction

`docs/audit/BUILD_COMPLETENESS_2026-11-02.md` line 59 (M06) says the goal tree "`src/core/goals.ts` is tested but imported by nothing" and that `goal.kind` and `goal.metric_label` have no input or reader. This is stale. The tree lives in `src/core/goalTree.ts`; `buildTree` is imported by `src/ui/lifeUi.ts` (goals screen, goal page) and `src/core/printDoc.ts`; the goal form saves level, parent and measure (tests: `tests/goal_tree.test.ts`, `tests/goal_form.test.ts`; `docs/TODO.md` step 8). Correct the row in commit 12 and add a Change Log line; do not alter the audit's other findings.

## 10. Numbered build order (small end-to-end commits; each linked and tested)

Commits 1 to 4 change no visible screen except the stated fix; the first visible value is commit 5.

1. **Constant, not literal.** Replace the 18 `schemaVersion: 1` literals with `SCHEMA_VERSION` (still 1). Tests: a source check that no numeric `schemaVersion:` literal remains in `src`; full suite unchanged.
2. **Schema 2.** Add `task.goals` and `habit.goals` (catalog EN/BN text, entity ties), `SCHEMA_VERSION = 2`, `MIGRATIONS[1]`, v1 fixture, fingerprint update. Tests: migration copies the link, idempotent, drops no value, non-task untouched, newer record untouched, snapshot taken first, restore of a v1 backup yields the same links, field-reach and catalog parity tests.
3. **Core `taskGoals.ts`.** `goalIdsOf`, `liveGoalIdsOf`, `danglingGoalIdsOf`, `withTaskGoals`, `validateLinks`, `previewGoalRemoval`, `applyGoalRemoval`. Tests: fallback and "task.goals wins", dedupe, 5-id cap, namespace, mirror set/removed, unknown when empty, removal preview numbers equal applied result.
4. **Core maths and readers.** `goalProgress` over distinct ids with `isCountedTask`; `buildTree` set-union roll-up; `goalUniverse` and `homeCounts` dedupe; `linkStats`; switch task readers (`goalPlan`, `boards`, `realityLoop.impactOf`, `printDoc` steps, `screens` row text, `nextAction`) to `goalIdsOf`. Tests: the worked example number for number; shared step in two parts of one root counted once; empty goal gives null; overall property (random added links never change it); unshared fixture gives the same output as before except "no longer true" steps; allow-list guard: only `taskGoals.ts`, `migrate.ts`, notes, knowledge and onboarding may read `links.goal`.
5. **Link picker and chips.** Task form picker, "Which part?", chips on Today/Plan rows. Tests (jsdom): toggle saves the list; edit reloads; chip overflow at 360 px in EN/BN/mix; max 5 message has no red; opening the picker adds no task in overload mode; picker offers only same-namespace goals; i18n parity; accessibility names and `aria-pressed`; link-check for chip targets.
6. **Overview and goal page.** Goal cards, fact line, "not linked" card, paused row, "Steps" section with "Also:" chips. Tests: Unknown shows "Not known yet"; "not linked" card appears only when needed; collapsed paused row; link-check and precache tests.
7. **Where does this go.** `taskTrace` and the sheet section. Tests: percentNow/percentIfDone equal the real result after marking done; no advice text.
8. **Delete and repair.** Delete-goal preview and cascade, plan version, dangling-id row and remove-link. Tests: counts shown equal results; no step deleted; v1/partial backup with a dangling id keeps it and shows the row.
9. **M12.** Snapshot v2, `planDiff` link row, `impactOf` lines. Tests: v1 parses; v2 round trip; no false link-removed from a v1 side; impact scoped to B finds a step that also helps B; reduce-scope still adds no task.
10. **Print/PDF/report/hand-over.** Tests: shared step printed under each goal, counted once; hand-over hides goal names by default.
11. **Habits.** `habit.goals` picker and per-goal habit line. Tests: never enters a percent; no check-ins shows text, not 0.
12. **Paperwork.** Register rows and evidence (only from linked test artifacts), Change Log, `DECISIONS_LOG.md` entry (what, why, alternatives A and B, undo: revert code; data stays valid because `links.goal` mirror is kept), stale-audit correction, `docs/design/m-list-status.md`.

## 11. Risks

| Risk | Mitigation |
|---|---|
| Mirror and list disagree | one writer, "task.goals wins" rule, allow-list guard test, mirror rewritten on next save |
| Existing goal % shifts (no-longer-true steps now excluded) | recorded in decisions log and Change Log; test pins it |
| Users link everything to everything | cap 5; helper text; honest, not scored |
| Goal % can jump when a done step is linked | neutral trend copy, never red |
| Version bump re-migrating records | commit 1 constant first |
| Snapshot v2 vs old backups | v1 still parsed; missing = unknown |
| Hand-over leaks goal names | default off, tested |
| Phone form crowding | one chip row, optional part select only when needed |
| Deep goal tree with many parts | picker shows roots; parts only on demand |

## 12. Will not build

- Primary / also-helps split, or any "main goal" notion in the UI.
- Per-link weights, split credit, per-goal weighting, any invented share.
- A goal-comparison card, energy field, budget field, or any ranking, "best/behind" label, streak, score or red copy.
- An overall that averages goal percents, or an in-play filter that hides steps of paused goals from the overall.
- A `goal_link` entity, a link stored on the goal side, or automatic linking by AI or title matching.
- Habits inside any percent.
- Goal names on a hand-over without a tick.
- A new route or tab for multi-goal; a hard limit of 4 goals.
- New steps created by any link, mode or event.
