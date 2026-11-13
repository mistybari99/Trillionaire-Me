# Prompt-engineer agent and audit agent (owner rules, 6 Nov 2026)

Owner confirmed these rules in the Claude Code chat on 6 Nov 2026. Reason: the owner sends short Bangla/Banglish commands, vague commands make him repeat himself and waste usage.

## Rule 2 — before work starts: the Prompt-Engineer agent
For every owner command that is more than a one-line question or a trivial fix, the Prompt-Engineer agent (`.claude/agents/prompt-engineer.md`, read-only) runs FIRST and returns an exact work order:
1. Goal (one sentence) and the owner's own words, quoted.
2. Exact points to deliver, numbered.
3. Scope in / scope out.
4. Dependencies and links: what it depends on, what depends on it (files, routes, modules M01..M23, tests, docs).
5. Acceptance tests and evidence that will count.
6. Edge cases and guardrails (no scores/ranks/streaks, unknown is not 0, no guarantees, D-B/D-C/D-D limits, Bangla plain rules).
7. Which agents and skills to use.
8. Owner questions only if truly needed: one at a time, with a recommended default.
Only then builder agents start. A trivial command (typo, one-word question, status check) skips this step; say so in one line instead.

## Rule 1 — before "done": the read-only Audit agent
"End-to-end" means complete delivery: input, storage, calculation, output, export and links, linked to everything it depends on and everything that depends on it. Before a feature, option, function or plan row counts as done, a separate read-only Audit agent (`.claude/agents/audit-verifier.md`) checks: link check, dependents not broken, nothing left, no stubs, evidence exists. Only an explicit PASS counts. FAIL goes back to the builder with the list of gaps. The builder never audits its own work.

## Usage control
Both steps cost usage. Use the full chain for features and plan rows; for small fixes use a short work order and a quick audit of the changed files. Record the audit result next to the work (tracker row, report or commit message).

## Who replies
Only the main Claude Code session replies to the owner, in the CLAUDE.md section 5 format. Helper agents return their result to the main session, not to the owner.
