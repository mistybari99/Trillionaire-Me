# Multi-goal with shared tasks: Proposal A

Author: expert A (read-only on code). Date: 3 Nov 2026. Status: proposal only, nothing built.
Owner need: 3-4 big goals, each with its own tree; every action traceable to the goal(s) it serves; one task may help 2-3 goals; each goal's progress updates by itself; the app shows where each action goes.

## বাংলা সারাংশ

- প্রতিটি কাজের একটি **মূল লক্ষ্য** (main goal) থাকবে, আর ইচ্ছা হলে **"এটিও সাহায্য করে"** (also helps) দিয়ে আরও লক্ষ্য জোড়া যাবে। একই কাজ একবারই গোনা হবে।
- **মোট প্রোগ্রেস (overall %) একটাই**, প্রতিটি কাজ ঠিক একবার গোনা হয় (মূল লক্ষ্যের হিসেবে)। তাই দুবার গোনার সুযোগ নেই।
- প্রতিটি লক্ষ্যের নিজের % থাকে: কাজ "Done" হলে যে যে লক্ষ্যে জোড়া সবগুলোতেই পূর্ণ ক্রেডিট (ডিফল্ট)। চাইলে "ভাগ করে" (split) বেছে নেওয়া যায়।
- পুরোনো ডেটা বদলায় না। পুরোনো `links.goal` সেই কাজের মূল লক্ষ্য হয়ে থাকে। নতুন জোড়াগুলো আলাদা ছোট রেকর্ডে (`goal_link`) থাকে, তাই ব্যাকআপ/রিস্টোর/CSV-তে কিছু হারায় না।
- কাজের সারিতে ছোট চিপ: "→ দোকান (মূল) + শেখা"। এতে বোঝা যায় কাজটি কোথায় যাচ্ছে। কোনো র‍্যাংক, স্কোর বা "কোন লক্ষ্য ভালো" বলা হবে না।
- সময়/টাকা/এনার্জি তুলনা কার্ডে শুধু ব্যবহারকারীর নিজের দেওয়া সংখ্যা; না দিলে "দেওয়া হয়নি", শূন্য নয়।

---

## 0. Code facts this proposal rests on (checked in the repo)

| Fact | Where | Consequence |
|---|---|---|
| `TMRecord.links` is `Record<string,string>`: one value per key. A task has exactly one `links.goal`. | `src/core/types.ts:25`, `src/ui/screens.ts:290` | Many-to-many cannot live in `links`. Needs a new shape. |
| Goal progress = tasks with `links.goal === g.id`, done over total. Manual mode keeps a typed percent. | `goalPlan.ts` `goalProgress` | One function feeds tree, universe, reminders, advice, next action. Change it once, with care. |
| Tree branch = own steps + children's `branch.done/total` summed. | `goalTree.ts` lines 51-55 | A step linked to two sub-goals in one branch would be counted twice. Must change to a set of step ids. |
| Universe area totals add `p.total` over goals in an area. | `goalUniverse.ts` `universeData` | Same double count for two goals in one area. Must dedupe by step id. |
| Overall % pools every counted task once, with ONE device-wide weighting `prefs.progressMode` (equal or size). It is not per goal. | `overallProgress.ts`, `state.ts:101`, `screens.ts:766`, `lifeUi.ts:306` | Owner asks "per goal at creation". That is a gap today, not a regression. |
| `goal.progress_mode` already exists but means auto vs manual, not equal vs size. | `fields.ts:300` | New field needs a different name: `goal.weighting`. |
| Habits have no goal link. `habit_log` links to habit. | `fields.ts:405`, `screens.ts:857` | Habits can join the same link shape, but never enter the % (no done state). |
| Plan snapshot (M12) holds goals (id, title, status, date) and open/parked tasks (id, title, state). No links. | `realityLoop.ts:207-216` | Snapshot v1 cannot show a link change. Needs v2, v1 still readable. |
| `impactOf` finds tasks by `r.links?.goal === scope.id`. | `realityLoop.ts:113,118` | An event on goal B would miss a step that only "also helps" B. |
| `planDoc` (print/PDF) lists open steps by `links.goal`. | `printDoc.ts:21` | Shared step must appear under each goal, but be counted once in totals. |
| Planner takes one `PlanTask` per task id. | `planner.ts` | A shared step is scheduled once and its minutes count once in capacity. No change needed. Good. |
| `SCHEMA_VERSION = 1`, `MIGRATIONS[0]` only. `migrateAll` snapshots first and never drops a value. | `schema/entities.ts`, `core/migrate.ts` | Migration machinery exists and fits. |
| The build audit (2 Nov) says goal tree is "imported by nothing". Now `buildTree` is used in `lifeUi.ts` and `printDoc.ts`. | audit M06 row vs code | Audit line is stale. Fix it in the audit Change Log when this lands. |

---

## 1. Data model

### 1.1 Shape: one main goal + extra "also helps" links

**Decision: hybrid.**

- **Main goal** stays exactly where it is today: `task.links.goal`. Every old reader, backup, CSV and test keeps working. Habits get the same key (`habit.links.goal`), new and additive.
- **Also helps** are separate small records of a new entity `goal_link` (one per task-goal pair).

Why not a list field on the task (`task.also_goals`)? It is simpler, but it cannot carry a per-link field later, and one stale id inside a list is hard to repair field by field. Why not make every link an edge and mirror `links.goal`? Two sources of truth drift. The hybrid has one source for each fact: main goal = `links.goal`, extra = edges.

```ts
// entity "goal_link"  (family FAM-03, module M06, privacy "personal", parent: none)
// id is deterministic, so saving twice is a no-op:  `gl-${itemId}-${goalId}`
// links:  { item: <taskId | habitId>, goal: <goalId> }
// values: "goal_link.item_kind": "task" | "habit"          (choice, core)
//         "goal_link.created_on": date                      (optional)
```

New catalog fields (all additive, all optional, unknown = default):

| Field | Entity | Type | Meaning | Default when missing |
|---|---|---|---|---|
| `goal.weighting` | goal | choice `equal` / `size` | How this goal's steps weigh. Asked at creation (root goals only). Sub-goals and projects inherit the root. | Device default `prefs.progressMode` (so old goals behave as today) |
| `task.credit` | task | choice `full` / `split` | Shared step: full credit to each goal, or divided between the goals it helps. Shown only when the step helps 2+ goals. | `full` |
| `task.energy` | task | choice `low` / `medium` / `high` | The user's own feeling of effort, for the comparison card only. | unknown |
| `goal.budget_bdt` | goal | number (money) | Money the user plans to put in, own number. | unknown |

Rules that make the data safe:

- A link never crosses a namespace: the task, the goal and the edge are all `demo` or all `real` (D-B). Edge `ns` = task `ns`. Enforced in `setGoalLinks`.
- Edge id is `gl-<item>-<goal>`: no duplicate pairs by construction.
- Main goal and an "also" cannot be the same goal (`duplicate`).
- At most 5 goals per task (phone UI limit; `too_many`).
- Edges to a missing goal are kept (history) but ignored by maths and flagged by `integrityIssues` (see 6).

### 1.2 Migration of old single-goal data

No record has to change shape, because every old task already is "main goal = links.goal, no extras".

- Bump `SCHEMA_VERSION` 1 -> 2. `MIGRATIONS[1] = (r) => r` (identity; it only stamps the version). `migrateAll` already takes the safety snapshot first, never drops a value, and keeps a record from a newer app untouched. Reason to bump anyway: a v1 build then sees v2 records as "newer" and leaves them alone instead of editing them blindly. Update `tests/fixtures/schema_fingerprint.json` and keep a v1 fixture.
- Fallback if the owner prefers no bump: ship without it and log in `DECISIONS_LOG.md` "additive entity, no record changed". I recommend the bump (charter: schema change = migration + note).
- Backup/restore: `goal_link` is a normal entity, so JSON backup, encrypted backup and CSV carry it. CSV import must accept `goal_link`; restore of a v1 backup into a v2 app migrates as usual. A v2 backup restored into a v1 app: v1 ignores unknown edges, tasks keep their main goal. Nothing is lost, extras just do not show.
- Old `goal.progress_mode` (auto/manual) is untouched.

---

## 2. Progress maths

Words: a **pool** is the set of distinct steps counted for a goal. A **root** is a top-level goal (kind `goal`). Only user-entered steps are counted; no steps = Unknown (null), never 0. Done = has `task.done_on`. "No longer true" steps (`task.not_true_on`) are not counted, as today.

### 2.1 Which steps are in a goal's pool

`pool(G)` = steps whose main goal OR any also-link is G or a descendant of G, **as a set of step ids**. A step linked to two sub-goals of the same root is in the root's pool once.

### 2.2 Credit for a shared step

For a step t, let `k(t)` = number of **distinct roots** t reaches (through main + also links). Two sub-goals under one root count as one root.

- `credit = full` (default): factor `f = 1` in every pool it is in. The step is done once, so it is done for all. Simple and honest to "I'm touching this for both goals".
- `credit = split`: `f = 1 / k(t)`. In each pool the step weighs its normal weight times `f`. Use it when the user wants each goal to show only its own share of the work.

Done is global: one `done_on` per step. No partial done per goal (not built, see 9).

### 2.3 Goal percent (per goal, per weighting)

```
weight(t) = 1                         if weighting = equal
          = minutes | S15 M30 L60 | avg of this pool's known weights (or 1)   if weighting = size   (same as enteredWeight today)
goalPercent(G) = round( Σ_{t in pool(G), done} weight(t)*f(t)  /  Σ_{t in pool(G)} weight(t)*f(t) * 100 )
               = null when pool is empty  (Unknown, not 0)
```

Manual goals (`goal.progress_mode = manual`) keep their typed percent; their pool is still shown as a count, as in the universe today.

### 2.4 The ONE overall percent, no double counting

Rule: **for the overall, every step is counted exactly once, under its main root.** Also-links change the goals' own percents and the picture, never the overall.

```
groups:   one group per root R  = distinct counted steps whose MAIN goal is in R's tree
          plus one group "no goal" = counted steps with no main goal   (same as today: they are in the overall)
n_R   = number of steps in group R
f_R   = done fraction of group R under R's weighting (equal: done/total; size: doneW/totalW)
overall = round( Σ_R n_R * f_R / Σ_R n_R * 100 )      null when Σ n_R = 0
```

Each step is one unit; the weighting only shapes the fraction inside its own goal. If all goals use one weighting this equals today's formula exactly (equal: done/total; size: single pool). Mixed weightings give a clear unit-consistent mean. A step is never in two groups, so a shared step cannot count twice.

Overall also shows plain facts: "N steps counted once. M help more than one goal. K are not linked to a goal."

Recalculated when the plan changes: all of this is pure functions over the records, recomputed on render. Existing `ProgressMemory` still explains a fall ("a step was added/removed/unlinked"); a fall is a fact, never red.

### 2.5 Worked example (numbers are examples only)

Goals: A Shop (size), B Learn (equal), C Health (size). Steps:

| Step | Min | Main | Also | Done |
|---|---|---|---|---|
| t1 | 60 | A | B | yes |
| t2 | 30 | B | | yes |
| t3 | 30 | A | | no |
| t4 | 15 | C | | no |
| t5 | 15 | none | | yes |

Credit full: A pool {t1,t3}, size: 60/90 = **67%**. B pool {t1,t2}, equal: 2/2 = **100%**. C {t4}: 0/15 = **0%**.
Overall: groups A n=2 f=.67, B n=1 f=1, C n=1 f=0, none n=1 f=1 -> (1.33+1+0+1)/5 = **67%**. Steps counted: 5. Shared: 1. Not linked: 1.
Naive mean of goal percents would be (67+100+0)/3 = 56% and counts t1 twice. We do not do that.

Credit split on t1 (k=2, f=.5): A pool weights t1=30, t3=30 -> 30/60 = **50%**. B pool t1=.5, t2=1 -> 1.5/1.5 = **100%**. Overall stays 67% (the overall ignores `credit`).

### 2.6 Sub-goal roll-up

`buildTree` changes from "sum children's done/total" to "union of step-id sets": each node carries `stepIds: Set<string>`; the branch figure is computed from the union with the node's credit factors. Same number as today when nothing is shared. `GoalProgress` keeps `done`, `total`, `percent`; add `shared: number` (steps in this pool that also help another root) for display.

`universeData`: dedupe step ids inside an area before summing.

### 2.7 Habits

Habits link like tasks (main via `links.goal`, extras via `goal_link` with `item_kind=habit`) so "every action is traceable". They are **not** in any percent (a repeating habit has no done state; this is the existing rule). Each goal shows a separate line "Habits: Read 10 min (3 of 4 days this week)", using the existing habit check-in count. Never merged into the %.

---

## 3. UI flows (360 px, EN / BN / mix, 44 px touch rows)

Routes stay hash routes. Add `#/journey/goals/<id>` (one goal's tree) to the router regex list (the router has no query parsing, so an id segment is used, not `?goal=`). Lock check stays first in `render()`. New screens go through `viaLazy` and the precache test.

1. **Goals overview** (`#/journey/goals`, extends today's screen). Top: one overall card (the single %, or "Unknown, add steps"; the 3 facts line). Below: one card per root goal: title, percent or "Unknown", "n open steps", chip "2 shared". Sort: by the user's own order (title, then id; same as `buildTree`), never by progress or value. Over 4 roots: cards become compact rows, no limit. Tap = separate tree.
2. **Separate tree** (`#/journey/goals/<id>`): breadcrumb, that root's tree only (sub-goals, projects, steps), its own percent, weighting label ("Counted equally" / "Counted by size"), habits line, and a "Shared with other goals" list (step -> other goal names). A segmented control at top of Plan/Today: `All | Shop | Learn | Health` (scrollable chips). It is a view filter saved as a UI pref, not data.
3. **Task form** (`planScreens`/`screens.ts` task form): replace the single `pt-goal` select with:
   - "Main goal" select (as today, default none).
   - "Also helps" checklist of the other goals (checkbox rows, only shown when a main goal is chosen; if the person ticks first, the first tick becomes main with a plain note).
   - When 2+ goals: a checkbox "Split the credit between goals" (maps to `task.credit`), short helper text: "Off = the step counts fully for each goal."
   - Save writes the task, then edges, in one batch via `setGoalLinks` (returns `{puts, deletes}`; screens call the repo once).
4. **Chips on every step row** (Today next actions, Plan list, boards, focus screen): `-> Shop (main) + Learn`. Max 2 chips shown then "+1". Chip tap opens that goal's tree scrolled to the step. A step with no goal shows a quiet "Not linked yet" chip with a tap to link (never red).
5. **"Where this goes" panel** (step detail / chip tap): for each linked goal, the path `Root > Sub-goal > Project`, the role (main / also), and the effect line: "Done here adds to Shop 67% and Learn 100%" computed from the same pure function, as plain facts. Pure: `taskTrace`.
6. **Today**: the existing 3-action list stays (planner output). Each card gets chips. A step helping several goals is one card, one slot (it is one action). No new tasks appear.
7. **Journey / report**: goal rings read `goalPools` (one ring per root). Add a "Shared steps" table (step, goals) and the overall facts line. All charts keep "Show as text".
8. **Print / PDF** (`planDoc`): a shared step is listed under each goal it helps; in non-main goals it carries `(also for: Shop)`. Footer: "Overall counts each step once (N steps)". `PlanStep` gets `alsoFor: string[]`.
9. **Hand-over (M10)**: the hand-over print lists the role's steps; each step may show "serves 2 goals". Default shows only the number. Goal names appear only if the person ticks "Include goal names" on the print screen (hand-over is `third_party`; goal titles are personal). Delegated shared steps still count for all linked goals when the owner records done.
10. **Goal creation**: root goals ask "How should this goal count progress?" `Equal (each step the same)` / `By size (minutes or S/M/L)`, default shown as the device default, with the one-line meaning. Changeable later; a change shows "Before 67%, now 60%" as a fact.

---

## 4. Delete / unlink rules

- **Unlink** (remove an "also"): deletes only the edge. The step stays. Confirm not needed (one tap, with an Undo toast).
- **Change main goal**: `setGoalLinks` swaps `links.goal` and converts edges in the same batch. The old main can become an "also" if the person leaves it ticked.
- **Remove main goal, edges exist**: the oldest "also" (by `created_on`, then id) is promoted to main in the same batch; the screen says which.
- **Remove last goal**: the step becomes "not linked". It still counts in the overall (as today) and shows the quiet chip.
- **Delete a goal**: preview before: "3 steps lose this goal; 2 keep another goal (promoted); 1 becomes not linked; 1 sub-goal moves up". Needs a confirm tap and an automatic M12 plan-version record (before/after snapshot). Steps are never deleted by deleting a goal. Edges to the goal are deleted; tasks keep their data.
- **Delete a step**: its edges are deleted in the same batch (`deletes`), so no orphan edges.
- Retire (goal status `retired`): see 5.

---

## 5. Edge cases

| Case | Rule |
|---|---|
| Circular | Goal tree cannot cycle (level order, `canBeChild`). Links are step -> goal only, so no graph loop. The existing `after` cycle handling in the planner is unchanged. |
| Same goal twice | Rejected (`duplicate`); deterministic edge id. |
| Linked to sub-goal and its own root | Allowed; pool dedupes by step id; the form warns "already counted under Shop". |
| Orphan edge (goal deleted elsewhere, e.g. restore of a partial backup) | `integrityIssues` lists it; maths ignores it; Settings > Data shows "1 link points to a goal that is gone" with a one-tap "Remove". Never silent. |
| Orphan sub-goal | Already shown at top with a note (`TreeNode.orphan`). Its steps still count in the root-less group via their main goal. |
| Main goal id missing | Treated as "not linked" in maths; chip shows "Not linked yet"; same repair flow. |
| Paused goal | Silences that goal's reminders (existing rule). Steps stay counted. A shared step with one active and one paused goal stays active; paused goal's chip is dimmed with "paused". A step whose every goal is paused is not suggested on Today (still in lists). No change to the overall. |
| Retired goal | History kept. Edges stay. Its percent is frozen-readable, shown as "Retired". If it was the main goal of steps, ask once "Keep as it is" (default) or "Make X the main goal". Default keeps; overall still groups under it. |
| Overload / minimum-week / pause mode | The planner sees one `PlanTask` per step, so a shared step is placed once and its minutes counted once in `feasibility`. Link tools only add edges, never tasks. A mode that parks a step parks it for every goal; the impact preview says so before the choice. |
| Manual-percent goal | Keeps the typed percent; its shared steps still show in the pool count. |
| Demo vs real | Links never cross namespaces. Clear real / Clear demo remove their edges with their records (`goal_link` is namespaced like any record). |
| Unknown estimates | Size weighting uses the pool average for a step with no size, as today. Split never invents minutes. |

---

## 6. Conflicts with M12 (reality events, plan versions) and M10 (hand-over)

**M12.**
- `Snapshot` goes to `v: 2`: each task gets `goalIds: string[]` (main first). `parseSnapshot` still reads v1; for a v1 snapshot a missing `goalIds` means **unknown**, not empty, so `planDiff` shows no false "link removed".
- `planDiff` adds a row kind `link`: "Step X: Shop -> Shop, Learn".
- `impactOf`: replace `r.links?.goal === scope.id` with `goalIdsOf(recs, r.id).includes(scope.id)`. Time events (`time_less`, `new_duty`, `illness`) collect goal ids from all of a step's links, so one event can list several goals. A new impact line: "This step also helps Learn".
- Options still come from `OPTION_ORDER`, at most 3, none adds a task. Reduce-scope on a shared step affects each goal: the preview lists those goals first.
- Any link change that moves a main goal or deletes a goal writes a `plan_version` (same atomic path as today). Adding an "also" does not (it adds no cost, so a version would only be noise); it is logged in the journey log as one plain line.

**M10.** `task.links.role` and `links.goal` are different keys, so they coexist. `syncDelegation` and `assignTask` do not touch edges. `completeHandover` leaves goals alone. Print default hides goal names (above).

**Reminders** (`goalReminders`): a goal at 100% via a shared step stops reminding; fine, it is the same number the user sees.

---

## 7. Time / money / energy comparison card (user-entered numbers only)

Goals overview, below the cards, collapsed by default: "Compare my goals". One row per root, no sorting by "best", no totals ranking, no verdict text.

| Column | Source | Shared-step rule | Unknown |
|---|---|---|---|
| Time (planned) | sum of `task.minutes` of open steps, **main-goal only** | Shared steps shown on a second line "+90 min shared with other goals" so the sum never double counts | "k steps have no estimate" (not 0) |
| Time (focus, last 7 days) | `focus_session` minutes of the step | Counted under the main goal only | none = "no focus sessions" |
| Money | `goal.budget_bdt` (BDT) | n/a | "not entered" |
| Energy | count of open steps by `task.energy` (low / medium / high) | Counted under main goal | "k steps: not marked" |

Show as small bars with "Show as text". No percentages of "return", no scores. If fewer than 2 goals have any entered number, the card says "Add estimates to compare" and shows nothing else.

---

## 8. Pure core API (new `src/core/goalLinks.ts`, `src/core/goalPools.ts`)

```ts
// goalLinks.ts
export type LinkError = "goal_missing" | "other_namespace" | "duplicate" | "too_many" | "item_missing";
export interface GoalLinks { primary: string | null; also: string[] }           // also is sorted by created_on, id
export const edgeId = (itemId: string, goalId: string): string => `gl-${itemId}-${goalId}`;
export function goalLinksOf(recs: readonly TMRecord[], itemId: string): GoalLinks;
export const goalIdsOf = (recs: readonly TMRecord[], itemId: string): string[];   // primary first
export function setGoalLinks(recs: readonly TMRecord[], itemId: string, want: { primary: string | null; also: string[] },
  nowIso: string): { puts: TMRecord[]; deletes: string[] } | { error: LinkError };
export interface RemovePreview { loseGoal: number; promoted: number; unlinked: number; childrenMoveUp: number }
export function previewGoalRemoval(recs: readonly TMRecord[], goalId: string): RemovePreview;
export function applyGoalRemoval(recs: readonly TMRecord[], goalId: string, nowIso: string): { puts: TMRecord[]; deletes: string[] };
export interface TraceRow { goalId: string; role: "main" | "also"; path: Array<{ id: string; title: string; kind: GoalKind }>; percentNow: number | null; percentIfDone: number | null }
export function taskTrace(recs: readonly TMRecord[], taskId: string): TraceRow[];
export interface LinkIssue { kind: "edge_goal_gone" | "edge_item_gone" | "main_goal_gone" | "edge_cross_ns"; id: string }
export function integrityIssues(recs: readonly TMRecord[]): LinkIssue[];

// goalPools.ts
export type Weighting = "equal" | "size";
export const weightingOf = (root: TMRecord, deviceDefault: Weighting): Weighting;
export function rootOf(recs: readonly TMRecord[], goalId: string): string | null;     // top of the tree; orphan -> itself
export function poolOf(recs: readonly TMRecord[], goalId: string): string[];          // distinct counted step ids
export function creditFactor(recs: readonly TMRecord[], taskId: string): number;      // 1, or 1 / distinct roots when task.credit = split
export function poolProgress(recs: readonly TMRecord[], goalId: string, deviceDefault: Weighting): GoalProgress & { shared: number };
export function overallByMainGoal(recs: readonly TMRecord[], deviceDefault: Weighting):
  OverallProgress & { shared: number; unlinked: number };
export interface CompareRow { goalId: string; plannedMinutes: number | null; sharedMinutes: number; noEstimate: number; focusMinutes7d: number;
  budgetBdt: number | null; energy: { low: number; medium: number; high: number; unmarked: number } }
export function compareGoals(recs: readonly TMRecord[], today: string): CompareRow[];
```

Call-site changes: `goalProgress` (goalPlan.ts) delegates its `mine` list to `poolOf`; `buildTree` uses step-id sets; `universeData` dedupes; `overallProgress` callers (`lifeUi.ts:306`, `screens.ts:766`) call `overallByMainGoal`; `boards.taskBoard` keeps main goal (adds `alsoGoalIds`); `planDoc` adds `alsoFor`; `snapshotOf` adds `goalIds`.

---

## 9. Tests (add with each commit; all names indicative)

Core, pure (vitest):
1. `goalLinks.test.ts`: set/replace links returns right puts/deletes; duplicate, cross-namespace, missing goal, too-many errors; idempotent edge id; promote-on-remove; delete-goal preview numbers equal applied result.
2. `goalPools.test.ts`: the worked example in 2.5 gives 67 / 100 / 0 / overall 67 and split 50 / 100 / 67; empty pool = null (Unknown, not 0); step in two sub-goals of one root counted once; no-goal group included; all-equal case equals the old `overallProgress` on a randomised fixture (property test).
3. Overall never changes when an "also" is added or removed (property: add random edges, overall unchanged).
4. `goalTree.test.ts`: branch figure unchanged for unshared fixtures; shared in same branch no double count.
5. `universe`: two goals in one area sharing a step count it once.
6. `compareGoals`: unknown estimate not 0; shared minutes on a second line; fewer than 2 entered = no rows.
7. Migration: v1 fixture (task with `links.goal`, no edges) loads, `migrateAll` to v2 changes no value; newer record left untouched; snapshot taken first; fingerprint test updated.
8. M12: snapshot v1 parses; v2 round trip; `planDiff` link row; `impactOf` scoped to B finds a step that only "also helps" B; reduce-scope never adds a task (existing guard extended).
9. Planner/feasibility: a shared step's minutes count once in `feasibility`.
10. Backup: JSON + encrypted + CSV export/import keep `goal_link`; "Clear real" removes real edges only.

UI (jsdom): task form saves main + 2 also + split; chips render in EN/BN/mix at 360 px without overflow; "Not linked yet" chip has no red/punishing copy (copy lint test already used for guardrails); delete-goal preview shows counts; `#/journey/goals/<id>` route resolves, lock first; link-check test passes for every new route and chip target; precache test passes for the new chunk; print doc lists a shared step under both goals and counts it once; hand-over print hides goal names by default; all new keys exist in en, bn, mix packs (i18n parity test); every new field has a catalog entry and a reachable output (field_reach test).

---

## 10. Risks

| Risk | Mitigation |
|---|---|
| Hybrid storage (main in `links.goal`, extras in edges) can drift or confuse readers | Only `goalLinks.ts` writes either; `integrityIssues` test on every fixture; screens never write links directly. |
| Changing `goalProgress` ripples to universe, reminders, advice, next action | One PR step for the shared pool function with a "same output when nothing is shared" snapshot test before any UI. |
| Two meanings of "weighting" (device pref vs per goal) | Device pref becomes only the default for goals without `goal.weighting`; Settings > Plan label says so. |
| Overall formula for mixed weightings is new | Equal to today's formula for a single weighting (property test); formula text shown on the overall card ("each step counts once"). |
| "Full credit" may overstate when a user links many goals | Split option, and the overall ignores extras. Copy states it plainly. |
| Phone form gets long | Checklist hidden until a main goal is set; max 5 goals; one extra checkbox only for 2+ goals. |
| Print/PDF repeats a step | Marker `(also for: ...)` and footer "counted once". |
| Snapshot v2 vs old versions in backups | v1 still parsed; missing `goalIds` = unknown. |
| Schema bump touches every record once | Snapshot before migrate (existing); identity step; fallback of no bump is logged. |

---

## 11. Build order (small commits, tests with each)

1. `goalLinks.ts` + entity `goal_link` + catalog fields + migration 1->2 + fixtures. (No UI.)
2. `goalPools.ts` + switch `goalProgress` to pools; same-output snapshot test; fix `buildTree` and `universeData` dedupe.
3. `overallByMainGoal` + per-goal `goal.weighting` field + goal creation question; replace the two `overallProgress` call sites; overall facts line.
4. Task form: main + also checklist + split; edit-links sheet; chips on step rows.
5. Separate tree route `#/journey/goals/<id>`, overview cards, view filter chips, "Where this goes" panel (`taskTrace`).
6. Delete/unlink flows with preview; integrity repair row in Settings > Data.
7. M12: snapshot v2, `planDiff` link row, `impactOf` via `goalIdsOf`, version on main-goal moves.
8. Habit links + habits line per goal.
9. Print/PDF `alsoFor`; hand-over default-hidden goal names; report shared table.
10. Compare card (`task.energy`, `goal.budget_bdt`, `compareGoals`).
11. Register + Change Log + audit correction; `DECISIONS_LOG.md` entry with undo (remove `goal_link` records and the new fields; old data untouched because `links.goal` never changed).

---

## 12. What I would NOT build

- No score, rank, "best goal", "neglected goal" red flag, streak, or advice on how to split time between goals.
- No per-goal partial "done" for one step, and no custom percent shares per link (only full or equal split).
- No automatic linking by AI or by keyword match. The person links; the app never guesses.
- No automatic move of a step to another goal when one is paused or retired (only a one-time question on retire).
- No goal limit of "max 4" (suggest, do not enforce).
- No overall that averages goal percents (it would double count).
- No new tasks created by any link, mode, or event.
- No cross-namespace links (demo to real), no network, no sync of links beyond the existing backup/export paths.
- No goal-to-money automatic roll-up from the Money screen (finance lines have no goal link; the user types `goal.budget_bdt` themselves).
- No hand-over export of goal names unless the person ticks it.
