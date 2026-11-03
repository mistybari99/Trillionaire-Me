# Multi-goal tracing: Proposal B (the smallest model that works)

Author: expert B, read-only on code, written independently of proposal A. Status: proposal only, nothing built.
Inputs read: CLAUDE.md, settings-final-decision.md (format), goalTree.ts, goalPlan.ts, overallProgress.ts, northStar.ts, planner.ts, migrate.ts, entities.ts, fields.ts, lifeUi.ts goals and overall card, screens.ts task form, printDoc.ts, realityLoop.ts, BUILD_COMPLETENESS audit, m-list-status.md.

## বাংলা সারাংশ

- একটি কাজ (task) এখন একাধিক লক্ষ্যের সঙ্গে জোড়া যাবে। কাজের ফর্মে লক্ষ্যগুলো ছোট চিপ: ট্যাপ করলে জোড়া, আবার ট্যাপ করলে খোলা। "মূল লক্ষ্য / সহায়ক লক্ষ্য" ভাগ নেই, ওজন নেই।
- ডেটায় নতুন জিনিস একটাই: কাজের একটি তালিকা-ফিল্ড `task.goals` (লক্ষ্যের id-র তালিকা)। পুরোনো `links.goal` পড়ে নতুনটা ভরে দেওয়া হয়, কিছু হারায় না।
- প্রতিটি লক্ষ্য নিজের কাজ গুনে নিজের % দেখায়। একটি শেয়ার করা কাজ শেষ হলে সংশ্লিষ্ট প্রতিটি লক্ষ্য পুরো ক্রেডিট পায়, ভাগ হয় না।
- মোট প্রগতি (overall %) আগের মতোই: প্রতিটি কাজ একবারই গোনা হয়। তাই দ্বিগুণ গোনার ঝুঁকি নেই। লক্ষ্যের % গড় করে মোট বানানো হবে না।
- লক্ষ্য তুলনার কার্ড, র‍্যাংক, রং-নম্বর বানানো হবে না।

---

## 0. Facts in the code that decide the design

| Fact | Where | Consequence |
|---|---|---|
| A task points to its goal with `links.goal`, one string. `links` is `Record<string,string>`, so it cannot hold two values. | `types.ts` line 25, `goalPlan.ts` `goalProgress`, `screens.ts` task form (one `<select>`) | Many-to-many needs one new place that holds a list. |
| `overallProgress(recs, mode)` loops over **tasks**, not goals. Each counted task is added once, linked or not. | `overallProgress.ts` | The overall number **already cannot double count**. The multi-goal change must leave it alone. This is the central insight of this proposal. |
| `buildTree` adds a child branch to its parent: `n.branch.done += c.branch.done`. If one task were linked to a project and its parent goal, it would count twice in that branch. | `goalTree.ts` `walk` | Roll-up must pool a **set of task ids**, not add counts. |
| Fields of type `list` already exist (`readList`, `listValue`, SWOT). Unknown is `{state:"unknown"}`. | `goalPlan.ts`, `fields.ts` | `task.goals` can be a plain `list` field. No new field type. |
| `links.goal` is read in `goalPlan.ts`, `goalTree`-using code, `boards.ts`, `knowledge.ts`, `realityLoop.ts`, `printDoc.ts`, `onboardUi.ts`, `screens.ts`. | grep | One reader function must replace all of them, or the new links silently show nowhere. |
| `goalStatusOf` gives active / paused / retired. `realityLoop.activeGoals` already filters on it. | `goalStatus.ts` | Paused and retired need no new field. |
| `SCHEMA_VERSION = 1`; `MIGRATIONS[n]` upgrades n to n+1; migration runs after a `before_migrate` snapshot; a step may never drop a value. | `migrate.ts`, `entities.ts` | A v2 step is cheap and fits the charter. |
| `schedule()` takes `PlanTask {id, minutes, priority, after}` and places each task once. | `planner.ts` | Planner needs **no change**. A shared task is one block of time, not two. |

## 1. Challenges to the obvious design (decisions, with reasons)

| Obvious idea | Verdict | Why |
|---|---|---|
| "Primary goal" plus "also helps" goals | **Do not build.** One flat set of goals per task. | Asking the user to rank their own goals on every task is a question with no good answer ("which goal is this really for?"). It also invites an implied ranking of goals, which the charter forbids. The only thing a primary buys is a place to put the task in a printout, and that can be decided by a stable sort. |
| Per-link weight ("60 percent to A, 40 percent to B") | **Do not build.** | It is an invented number (rule: no invented numbers). It forces a split the owner did not ask for: he said "I am touching this for both goals", which is full credit to each. It also breaks the plain sentence "3 of 8 steps done" that a phone user understands. |
| Goal-vs-goal comparison card | **Do not build.** | Putting three percents side by side is already done by three cards on one screen. A dedicated comparison view invites "which goal is behind", which reads as ranking and punishment. Missed goals stay quiet. |
| Overall % = average of the goal %s | **Wrong. Do not build.** | A shared task would be counted once per goal, a goal with 1 task would weigh as much as one with 40, and size mode would disagree with its own tasks (worked example in section 3 shows 44 versus the true 53). |
| Separate `goal_link` join record | **Do not build.** | A second entity means a second delete path, a second backup shape, a second sync, and a second thing to forget in the PDF. A list on the task is the whole model. |
| Mirroring the list onto the goal side | **Do not build.** | Two sources of truth. The task owns the link. A goal's tasks are always computed. |

## 2. Data model and migration

### 2.1 One new field

```
task.goals   type: list   entity: task   importance: useful   privacy: personal (same as task)
             value: ["goal-id-1", "goal-id-2"]   (order = the order the user tapped; no meaning)
             unknown/absent: "not linked yet" (never "linked to nothing on purpose")
```

Plus the same field for habits: `habit.goals` (list). Habits are only traced, never counted in percent (section 3.6).

Catalog text (EN / BN) for the field: label "Helps these goals" / "যে লক্ষ্যগুলোকে সাহায্য করে"; why "So each goal's progress updates when this is done." / "কাজটি শেষ হলে এই লক্ষ্যগুলোর প্রগতি নিজে বাড়ে।"

`links.goal` stays valid and keeps being **written** as a read-only mirror of the first element (`links.goal = goals[0]`), only by the single writer below. Reason: older code paths and a possible rollback keep working. It is never shown as "primary" and never read by new code.

### 2.2 One reader, one writer (pure, in `src/core/taskGoals.ts`)

```ts
/** All goal ids this task serves, de-duplicated, in stored order. Reads task.goals; if absent, falls back to links.goal; else []. */
export function goalIdsOf(task: TMRecord): string[];

/** Only ids that exist in `goals` (same namespace). Dangling ids are ignored here and dropped on the next save. */
export function liveGoalIdsOf(task: TMRecord, goals: ReadonlySet<string>): string[];

/** The ONLY function that writes the link. Returns a new record: values["task.goals"] set (or {state:"unknown"} when empty),
 *  links.goal mirrored to the first id (removed when empty). Dedupes. Max 5 ids (UI limit, rejected above with "goals_max"). */
export function withTaskGoals(task: TMRecord, ids: readonly string[]): TMRecord;

export type LinkError = "goals_max" | "goal_unknown" | "goal_other_namespace";
export function validateLinks(recs: readonly TMRecord[], task: TMRecord, ids: readonly string[]): LinkError | null;
```

Every existing `links.goal` reader in the list in section 0 is switched to `goalIdsOf` (or `liveGoalIdsOf`) in one commit, guarded by a test that greps `src/` for `links?.goal` and `links!.goal` and fails if any appear outside `taskGoals.ts` (the same style as the existing link-check test).

### 2.3 Migration

Schema version 1 to 2 (additive). `SCHEMA_VERSION = 2`, and the hard-coded `schemaVersion: 1` in `saveTyped` and the other writers is replaced by the exported constant (they currently ignore it; this is a real chore and is its own commit, see section 9).

```ts
MIGRATIONS[1] = (r) => {
  if (r.entity !== "task" || r.values["task.goals"]) return r;       // idempotent, other records untouched
  const g = r.links?.goal; if (!g) return r;                          // nothing to copy: stays unknown, not []
  return { ...r, values: { ...r.values, "task.goals": { state: "value", value: [g], label: r.ns === "real" ? "FACT" : "DEMO" } } };
};
```

Rules kept: never drops a value, `links.goal` left in place, id/ns/entity unchanged, runs after the existing `before_migrate` snapshot, a record from a newer app is left alone. Test fixture of a v1 task kept; the schema fingerprint file is updated. Because `goalIdsOf` also falls back to `links.goal`, the app is correct **even if the migration did not run** (for example restore of an old backup: `restoreBackupAtomic` runs migration after load, and the fallback covers the gap).

Undo: revert the code. Data stays valid under v1 readers because `links.goal` is still present.

Alternative considered: no version bump, read-through only. Smaller, but the charter asks for a versioned migration on schema change, and an explicit step makes backups self-describing. Chosen: bump.

## 3. Progress maths

### 3.1 Definitions

- A task is **counted** if `isCountedTask` (not "no longer true"). Unchanged.
- A task is **in play** unless it has at least one goal link and **every** linked goal is paused or retired. Tasks with no link are in play. (Retiring or pausing a whole goal therefore stops its tasks from pulling the overall number, but a task still serving an active goal stays.)
- **Weight** of a counted task: one pass over all in-play counted tasks produces a map `w(task)`:
  `equal` gives 1 for every task; `size` gives minutes or S/M/L, else the average of known weights (1 if none known), exactly as today. The average is computed **once** over all in-play tasks and reused, so a task has the same weight in the overall number and in every goal it belongs to.

```ts
export function taskWeights(recs: readonly TMRecord[], mode: ProgressMode): Map<string, number>;   // in-play counted tasks only
```

### 3.2 Per goal (own steps)

`tasksOf(goal) = in-play counted tasks whose goalIdsOf includes goal.id`.
`percent(goal) = round(100 * sum w over done tasksOf / sum w over tasksOf)`. Zero tasks gives `null` (Unknown), never 0. A shared task gives **full credit to each goal** it lists; its weight is not divided.

### 3.3 Roll-up (goal, sub-goal, project)

`branchTasks(node) = union over the node and all descendants of tasksOf(...)`, a **set keyed by task id**, so a task linked to both a project and its parent goal counts once in that branch. `branch.done`, `branch.total`, `branch.percent` come from the set. This replaces the `+=` in `buildTree.walk` (a 6-line change). Manual-mode goals still show their typed percent and ignore the branch figure (unchanged).

### 3.4 ONE overall percent, no double counting

`overallProgress(recs, mode)` keeps its exact signature and meaning: sum of weights of done in-play counted tasks over sum of weights of all in-play counted tasks, each task once. The only edit is the in-play filter. **It never reads goal percents.** Unlinked tasks stay in the overall number and are shown as "No goal yet" (section 5.3).

The screen says the relationship in one muted line under the goal cards: "One step that helps two goals counts in both goals, and once in the total." / "একটি কাজ দুই লক্ষ্যে সাহায্য করলে দুই লক্ষ্যেই গোনা হয়, মোটে একবার।"

### 3.5 Weighting equal vs size

One global switch (`prefs.progressMode`, already exists) drives overall and every goal. A per-goal mode is **not** built: two goals using different weighting would make a shared task weigh differently in each, and the overall number could not be explained. If the owner later wants it, it is one optional field `goal.weighting` read through `taskWeights` (not before).

### 3.6 Habits

A habit is recurring and has no finish line, so it has no place in a percent. A habit with `habit.goals` shows under each goal as a plain line: "Habits: Walk 20 min (4 of 5 days this week)". The count comes from existing `habit_log` rows. It is never added to a goal percent or to the overall number. Unknown (no check-ins recorded) shows "no check-ins yet", not 0.

### 3.7 Worked example

Three goals. Size mode (minutes entered everywhere). Done means a done date exists.

| Task | Goals | Min | Done |
|---|---|---|---|
| t1 | A | 30 | yes |
| t2 | A, B | 60 | yes |
| t3 | B | 30 | no |
| t4 | A, B, C | 60 | no |
| t5 | C | 30 | yes |
| t6 | none | 15 | no |

Equal weighting:

| | tasks | done | percent |
|---|---|---|---|
| A | t1 t2 t4 | 2 of 3 | 67 |
| B | t2 t3 t4 | 1 of 3 | 33 |
| C | t4 t5 | 1 of 2 | 50 |
| Overall | all 6 once | t1 t2 t5 = 3 of 6 | **50** |

(Goal steps add to 8 but the plan has 6 tasks. That is correct and is exactly the line in 3.4.)

Size weighting:

| | weights | done weight | percent |
|---|---|---|---|
| A | 30+60+60 = 150 | 30+60 = 90 | 60 |
| B | 60+30+60 = 150 | 60 | 40 |
| C | 60+30 = 90 | 30 | 33 |
| Overall | 225 | 30+60+30 = 120 | **53** (120/225 = 0.533) |

Why the average of goal percents is wrong: (60+40+33)/3 = 44, not 53. Why summing per-goal weights is wrong: 150+150+90 = 390 counts t2 twice and t4 three times.

When t4 is finished: A 150/150 = 100, B 120/150 = 80, C 90/90 = 100, overall 180/225 = 80. Three goals moved from one tap; overall moved once.

## 4. UI: smallest thing a phone user understands at a glance

Principle: **no new screen is needed for the feature to work.** It is one picker, one chip row, one extra line per goal card, and one bucket card. All existing screens just show the chip.

### 4.1 Overview: Journey goals (`#/journey/goals`) and the Journey card

Top to bottom at 360 px:
1. The existing overall card (one big number). Unchanged position.
2. One card per **top-level goal** (3 to 4 cards, stacked, no grid): title, ring with percent (or "Not known yet"), "5 of 8 steps", and one muted line only when relevant: "3 steps also help other goals." Tap opens the goal page.
3. A "No goal yet" card only when at least one counted task has no goal: "4 steps are not linked to a goal. Link them." Tap opens the list of those tasks.
4. Paused and retired goals are hidden under one collapsed row "Paused goals (2)" so the main view stays at 3 to 4 cards.
5. The existing muted explanation line from 3.4.

No comparison card, no sorting by progress; order is by title as today. The new-goal form stays at the bottom (it is above the list today; moving it below the cards puts the cards in the first fold).

### 4.2 Separate trees

Each top-level goal card opens its existing goal page (`#/journey/goal/:id`), which already shows the tree and progress. Add one section there: **Steps**, grouped by branch node (goal itself, then each sub-goal/project). A shared step appears under every goal that lists it, with a small chip "Also: Health" naming the other goals (text, not only colour). The tree view (`treeView`) shows each node's branch percent from the set-based roll-up. Three or four goals means three or four independent trees by construction: the roots.

### 4.3 Link picker (task form and task edit)

Replaces the single goal `<select>` in `screens.ts` (and the one in `onboardUi.ts`, which stays single because onboarding creates the first goal).

- One row of toggle chips, one per **top-level** goal in the active namespace (3 to 4 chips). Tap = linked (filled with a check icon), tap again = unlinked. `aria-pressed`, min 44 px, wraps to a second row at 360 px.
- Under a **selected** chip, if that goal has sub-goals or projects, a small "Which part? (optional)" select appears, default "Whole goal". If a part is chosen, that part's id is stored instead of the root id (the root is implied by ancestry). So the stored list can mix root and part ids, and the percent logic already handles both via roll-up.
- Helper line, plain: "Tap every goal this step helps." / "এই কাজ যে লক্ষ্যগুলোকে সাহায্য করে, প্রতিটি ট্যাপ করুন।"
- Nothing selected is allowed ("No goal yet" is a normal state, not an error). There is no required field and no default goal.
- Max 5 ids; the sixth tap shows a polite one-line message, no red.

Why this works at a glance: it is one row of tappable names, no menu to open, no ranking, no numbers.

### 4.4 Chips (where each action goes)

A task row anywhere shows up to 2 chips plus "+N": `[Business] [Health] +1`. Chip text is the goal title shortened to 14 characters with the full title in `title`/`aria-label`. Chips are links to the goal page. They carry text, never only colour (an optional soft per-goal tint derived from the goal's index in the sorted roots is allowed, but it carries no meaning and is off for high-contrast theme). Retired goal chips show greyed with "(retired)". No chips on a task that has no link; that row has a quiet "Link to a goal" link instead.

### 4.5 Today

Task rows get the chip row from 4.4. That is the whole change; "Today" is still 1 to 3 actions, no grouping by goal, no per-goal header. The overall card stays. In overload / minimum-week / pause mode the chips still show (they are information) and nothing is added.

### 4.6 Journey, Report, PDF, hand-over

- **Journey**: the goals card (4.1) replaces the single "goal rings" list; the overall card is the same one.
- **Report** (`#/journey/report`): the existing goal rings now come from `branch.percent`. Add the one explanation line from 3.4. Missed goal copy unchanged (no red).
- **PDF / print** (`printDoc.planDoc`): `steps` per node is filled with `goalIdsOf(x).includes(n.id)` instead of `links.goal === n.id`. A shared step prints under **each** of its goals and carries "(also: Health)". Page footer line: "Shared steps count once in the total." Ordering of goals is by title, so no goal is implied to be the main one. The overall percent prints once at the top.
- **M10 hand-over** (`handover` record, role link): the hand-over sheet lists the role's steps and now prints their goal chips as text, so the person taking over sees "this step serves Business and Health". Delegating a step keeps its goals; when the other person marks it done (`task.done_on`), every goal updates through the same maths, because progress reads the task, not who did it.

## 5. Delete and unlink rules

| Action | Rule |
|---|---|
| Untap a chip (unlink) | Removes that id from `task.goals`. Task stays. Progress of that goal recalculates immediately. No confirmation (it is reversible with one tap). |
| Delete a **task** | Gone from every goal it served. The existing delete flow is used; the confirm text adds "It also leaves 2 goals" when it had more than one. |
| Delete a **goal** | Its id is removed from every task's `task.goals` and `habit.goals` (cascade unlink in one transaction). Tasks are **never** deleted. Tasks left with no goal move to the "No goal yet" bucket (nothing is lost, nothing silently re-parented). The confirm says how many steps will become unlinked. Children of a deleted goal follow the existing `orphan` behaviour of `buildTree`. |
| Retire a goal | Chips stay, greyed. Tasks stay linked. Section 3.1 in-play rule applies. Reversible via the existing status card. |
| Pause a goal | Same as retire, shown under "Paused goals". Per charter, paused goals give no reminders (already so). |
| Move a sub-goal to another parent (`validatePlace`) | Tasks linked to the sub-goal move with it; since the stored id is the sub-goal, its root changes automatically. No rewrite of tasks. |

## 6. Edge cases

1. **Orphans**: (a) a task with no goal, counted in overall, shown in "No goal yet"; (b) a task pointing to a deleted or other-namespace goal id: ignored by `liveGoalIdsOf`, treated as unlinked, dropped on next save, never crashes; (c) an orphan sub-goal keeps today's behaviour (shown at the top with a note).
2. **Demo versus real**: the picker lists only goals of the same namespace as the task. `validateLinks` returns `goal_other_namespace` otherwise. Real data stays behind the consent tick; `task.goals` is part of the record so it travels with the record's backup rules, nothing new leaves the device.
3. **Archived/paused/retired goals** as in section 3.1 and 5. A task whose only goals are all paused disappears from the overall number and reappears when any is resumed. This is stated in one muted line on the paused row.
4. **Overload mode** (minimum week, pause): adds no tasks. The link picker only edits links of existing tasks. Percent is unchanged in these modes (they only change what the planner places, per `schedule()`).
5. **Planner**: untouched. A shared task is scheduled once with its own minutes; the 14 h free-time budget is never charged twice. Test below pins this.
6. **M12 plan versions and "no longer true"**: marking a task "no longer true" removes it from **every** goal's counts in one step; the reality screen lists the goals it was serving ("This step served Business and Health"). `impactOf` scope by goal switches to `goalIdsOf(t).includes(scope.id)`, and a shared step in the impact list gets a small line "also affects Health". Plan snapshot rows copy the task values, so `task.goals` is stored in each version and a version diff shows "link added/removed" as a change line. (If `versionRows` copies only selected fields, add `task.goals` to that list; it is the only change needed there.)
7. **A task in both a project and its parent goal**: one task in the branch set, counted once (3.3).
8. **Same goal twice in the list**: deduped by `withTaskGoals`.
9. **Task done, then re-linked to a new goal**: it counts as done for the new goal immediately (done is a property of the task). This is the intended meaning of "I'm touching this for both goals". A goal's percent can therefore rise on linking; a fall after linking a not-done task is a plain fact and uses the existing neutral "overall.fall" style copy, never red.
10. **Unknown is not 0**: a goal with no in-play task shows "Not known yet". A task with no size in size mode takes the average, as today.
11. **Manual-mode goals**: percent is the typed one; their tasks still count toward the overall number and still show chips.

## 7. Tests (each linked to a TM-REQ in the Register when built)

Core, pure (`tests/task_goals.test.ts`, `tests/goal_progress_shared.test.ts`):
1. `goalIdsOf`: reads `task.goals`; falls back to `links.goal`; dedupes; ignores non-strings; empty gives [].
2. `withTaskGoals`: mirrors `links.goal` to first; empty sets unknown and removes mirror; more than 5 gives `goals_max`.
3. The worked example in section 3.7 asserted number for number, equal and size, including after finishing t4.
4. Overall equals the plain `overallProgress` of all tasks and is **independent** of how many goals each task lists (property test: add random extra links, overall must not change).
5. Branch roll-up counts a task linked to both a project and its parent once.
6. Zero tasks gives `null`, never 0, for goal, branch and overall.
7. In-play rule: task whose goals are all paused is excluded; one active goal keeps it; unlinked stays.
8. Weights computed once: a no-size task has the same weight in overall and in each goal.
9. Migration `MIGRATIONS[1]`: v1 task with `links.goal` gets `task.goals`; idempotent; no value dropped; non-task untouched; fixture and schema fingerprint updated; failure keeps the original record.
10. Planner: two tasks identical except one lists three goals produce identical `schedule()` output.
11. Delete goal cascade removes the id from tasks and habits, deletes no task.
12. Link-check: no `links.goal` reads outside `taskGoals.ts`.

UI (`tests/multigoal_ui.test.ts`, jsdom like `goal_form.test.ts`):
13. Picker toggles chips, saves the list, edit reloads it; "Which part?" appears only for goals with children.
14. Task row on Today shows chips; a task with 3 goals shows 2 plus "+1".
15. Goal cards show "Not known yet" for empty goals; paused goals collapsed; "No goal yet" card appears only when needed.
16. Overload mode: no new task is created by opening the picker.
17. Print doc: a shared step prints under each goal with "(also: ...)", overall prints once. Hand-over sheet prints goal chips.
18. EN/BN/mix pack parity for every new key (existing key-parity test).
19. Accessibility: chip buttons have names and `aria-pressed`; 44 px target; no horizontal scroll at 360 px.
20. Demo versus real: picker never offers a goal of the other namespace; restore of a v1 backup yields the same percents as before the change.

## 8. Risks

| Risk | Mitigation |
|---|---|
| A reader still uses `links.goal` and misses the second link | The grep test (12) plus the mirror keeps old output sensible. |
| Users link everything to everything and every goal sits at the same percent | Honest, not wrong. Cap of 5, and the picker text asks for "every goal this step helps". No scoring on it. |
| The "No goal yet" card reads as a nag | It is shown only when such tasks exist; one muted line, no count in red, dismissible by linking or by ignoring. |
| Goal percent can jump when a task is linked | Documented in edge case 9; same neutral trend copy as the overall card. |
| Version bump touches the hard-coded `schemaVersion: 1` writers | Isolated first commit using the exported constant, with the fingerprint test. |
| Habit lines look like progress | They show counts as text only, no ring, no percent. |

## 9. Small-commit build order (one PR per block, tests with each)

1. **Constant, not literal**: replace hard-coded `schemaVersion: 1` with `SCHEMA_VERSION` everywhere (still 1). Test unchanged. (Pure refactor, enables step 2.)
2. **Schema**: add `task.goals` and `habit.goals` fields (catalog text EN/BN), `SCHEMA_VERSION = 2`, `MIGRATIONS[1]`, fixture, fingerprint. Test 9.
3. **Core**: `taskGoals.ts` (reader, writer, validate), tests 1, 2, 12 written first.
4. **Core maths**: `taskWeights`, in-play filter, set-based `goalProgress` and `buildTree.walk`; overall keeps signature. Tests 3 to 8, 10.
5. **Switch every reader** (`boards`, `knowledge`, `realityLoop`, `printDoc` steps, `goalPlan`, `screens` row text) to `goalIdsOf`. Test 12 turns green.
6. **Link picker + chips** in the task form and task rows (Today, Plan). Tests 13, 14, 18, 19.
7. **Goals overview**: top-level cards, "No goal yet" card, paused row, explanation line. Tests 15, 16.
8. **Goal page** steps grouped by branch with "Also:" chips. Test update.
9. **Delete/unlink** cascade and confirm text. Test 11, 20.
10. **Report, PDF, hand-over, reality** (impact line, version row field). Test 17 and reality tests.
11. **Habit lines** (traced only). Small.
12. Register and Change Log update, DECISIONS_LOG entry (D: one flat goal list per task, no primary, no weights, overall untouched), `m-list-status` regenerated, module M06 evidence updated.

Steps 1 to 5 change no screen and can ship alone: the app looks the same and is already correct with one link per task.

## 10. What I would NOT build

- Primary versus also-helps goals.
- Per-link weights or percent split of a task between goals.
- A goal-comparison card, ranking, "behind/ahead" labels, streaks, red copy.
- Overall percent as an average of goal percents.
- Per-goal equal/size mode (one global mode).
- A separate link entity, or the link stored on the goal side.
- Habits counted in any percent.
- Automatic linking by AI or by title matching (D-C; and it would invent links the user did not make).
- A new top-level screen or tab for multi-goal. Everything lives on the screens that already exist.
- A cross-goal dependency graph. The existing `task.after` already links tasks; goals add no dependency.
- Splitting a shared step's minutes across goals (the planner books it once; the goal cards just read the task).
