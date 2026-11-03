# Multi-goal: A's author on Proposal B

Voice: the author of Proposal A, writing honestly. Judge: see `multi-goal-final-decision.md`. Facts below were re-checked against the repo on 3 Nov 2026.

## বাংলা সারাংশ

- B-র সবচেয়ে বড় শক্তি: মোট % আসলে কাজ ধরে গোনা হয়, তাই আলাদা "মূল লক্ষ্য" হিসাব ছাড়াই দ্বিগুণ গোনা হয় না। আমি আমার overall সূত্রটা বাড়তি জটিল করেছিলাম, মানছি।
- B-র দুর্বলতা: (১) M12 snapshot-এ কাজের লিংক নেই, B ভুল ধরেছে; (২) paused লক্ষ্যের কাজ মোট % থেকে বাদ দিলে আগের আচরণ বদলে যায়; (৩) প্রতিটি লক্ষ্যের % এখন গণনা-ভিত্তিক, B-র "size" উদাহরণ কোডের সঙ্গে মেলে না; (৪) `links.goal` নোটেও ব্যবহার হয়, তাই B-র grep পরীক্ষা ভুলভাবে ধরবে।

## 1. What I concede (B is right)

1. **The overall % already counts each task once.** `overallProgress(recs, mode)` loops over tasks, not goals. My `overallByMainGoal` (groups per root, weighting per root, a new mixed-weighting mean) solves a problem that does not exist. Worse, it adds a second formula the owner cannot check by eye. B's "never read goal percents, leave the function alone" is simpler and provably correct. Conceded fully.
2. **Primary versus also-helps is a question with no good answer.** Asking "which goal is this really for?" on every task is friction for a phone user, and "primary" quietly ranks the owner's own goals. My only reason for a primary was the overall grouping, which I now drop.
3. **A separate `goal_link` entity is heavier than needed.** It adds a delete path, a backup shape, a CSV shape, an integrity checker and orphan-edge repair UI. A list on the task is enough for a single-user app with 3 to 4 goals.
4. **No new screen.** The goal page `#/journey/goal/:id` already shows one tree. B uses it. My new route `#/journey/goals/<id>` was duplicate work.
5. **Per-link weights, split credit, per-goal weighting are scope the owner did not ask for.** He said "touch it for both goals". Full credit to each is that sentence.
6. **Comparison card, energy and budget fields** are the most likely place for a "which goal is behind" reading. The owner asked where each action goes, not which goal is best.
7. **Smaller build order**: steps 1 to 5 of B change no screen and can ship alone. Good risk control.

## 2. Where B is wrong or weak

1. **B states a false fact about M12.** B says plan snapshot rows "copy the task values, so `task.goals` is stored in each version". They do not. `snapshotOf` returns `SnapTask { id, title, state }` and `SnapGoal { id, title, status, date }`, `Snapshot.v` is the literal `1`, and `parseSnapshot` rejects anything else. So a link change is invisible in a version diff unless snapshot v2 is built. B's "add `task.goals` to that list" does not exist as a list. This must be a real commit with a v1-still-readable rule (missing link data means unknown, not "removed").
2. **B changes the overall's meaning with an "in-play" filter.** Hiding a task from the overall because all its goals are paused or retired changes a number the owner already sees today. Pausing a goal would move the one overall %, and it would move it in a way that is hard to explain on a phone ("why did 40% become 55% when I paused Health?"). Nothing in the owner's requirement asks for it. It also makes a single task's weight differ by pause state, which B's own "weights computed once" test has to special-case.
3. **B's size-mode worked example does not match the code.** Today `goalProgress` is count-based (done tasks over linked tasks), with no weighting at all. `taskWeights` shared across all goals would silently change every existing goal percent in size mode from "5 of 8 steps" to a weighted figure, and the "5 of 8" text on the card would no longer match the ring. Needs an explicit decision (see judge: keep goal percent count-based).
4. **B's grep guard is too broad.** `links.goal` is also written and read by notes (`notesUi.ts:87`, `knowledge.ts:31`), onboarding and `homeCounts`. A test that fails on any `links?.goal` outside `taskGoals.ts` would either break notes or force a bad rewrite. The guard must be scoped to task records.
5. **One list field with a mirror has the same two-places problem I was blamed for.** `task.goals[0]` and `links.goal` can disagree (an old app edits `links.goal`; a CSV import sets one). B's answer is "goalIdsOf falls back", but never says which wins when both exist and differ. A rule is required.
6. **Mirroring "the first tapped" makes an accidental primary.** B says order has no meaning, yet `links.goal = goals[0]` and old code (boards, reminders) will then treat it as the goal. The UI must not show it, and printing must not use it.
7. **Dangling ids are "dropped on next save".** That is silent data loss of a link, against "nothing lost". Better: keep them, ignore in maths, and show a plain repair row.
8. **"Which part?" select under a chip** stores a sub-goal id in place of the root. Fine in principle, but then a step linked to the sub-goal `Shop > Stock` is not in the root's own list. The set-based roll-up handles it, but B does not say what the picker shows when the task is linked to two parts of one root. Needs a clear rule: count once per root.
9. **Per-goal weighting at creation was an owner-level wish in my brief.** B drops it with "one optional field later". The cost of dropping is small; I accept it, but B should say that the one global switch is the owner-visible rule.
10. **Habits**: B stores `habit.goals` as a list, same as tasks. Good. But B has no rule for what a habit with no check-ins shows other than text. Minor.
11. **Delete a goal cascades the id out of every task.** That is a real write to many records without a preview number of steps that keep another goal. B mentions the confirm count but not "n keep another goal".
12. **Hand-over (M10)**: B prints goal chips on the hand-over sheet by default. Hand-over is `third_party` privacy; goal titles are personal. A hand-over should show goal names only on a tick.

## 3. Bottom line from A

Take B's model (one flat list on the task, no primary, no weights, overall untouched, no new screen) and fix: M12 snapshot v2, drop the in-play filter, keep goal percents count-based, scope the guard to tasks, define who wins on disagreement, keep dangling ids visible, and hide goal names on hand-over by default. If those are fixed I have no objection to B's core.
