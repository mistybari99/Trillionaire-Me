import { describe, expect, it } from "vitest";
import { buildRecallIndex, filterRecall, ideaEventRecord, ideaHistory, similarIdeas, validateIdeaInput, validateIdeaLink, withIdeaPatch } from "../src/core/ideas";
import type { Namespace, TMRecord } from "../src/core/types";

const v = (value: unknown, ns: Namespace = "real") => ({ state: "value" as const, value, label: ns === "real" ? "FACT" as const : "DEMO" as const });
const rec = (id: string, entity: string, values: TMRecord["values"], ns: Namespace = "real", links?: Record<string, string>): TMRecord => ({ id, entity, ns, ownerId: ns === "real" ? "owner" : "demo-user", schemaVersion: 6, createdAt: "2026-11-01T10:00:00.000Z", values, ...(links ? { links } : {}) });

describe("personal idea and plan recall core", () => {
  const goal = rec("g1", "goal", { "goal.title": v("Grow shop"), "goal.kind": v("goal") });
  const project = rec("p1", "goal", { "goal.title": v("Delivery pilot"), "goal.kind": v("project") });
  const venture = rec("v1", "venture", { "venture.name": v("Corner shop") });
  const task = rec("t1", "task", { "task.title": v("Call three riders"), "task.done_on": v("2026-11-08") }, "real", { goal: "g1" });
  const idea = rec("i1", "capture", { "capture.title": v("Fast delivery"), "capture.note": v("Test delivery before spending"), "capture.kind": v("idea"), "capture.state": v("active"), "capture.changed_at": v("2026-11-08T09:00:00.000Z"), "capture.tags": v(["delivery", "test"]) }, "real", { goal: "g1", project: "p1", venture: "v1", task: "t1" });

  it("builds a disposable searchable document without mutating source records", () => {
    const all = [goal, project, venture, task, idea]; const before = JSON.stringify(all);
    const d = buildRecallIndex(all, "real")[0]!;
    expect(d).toMatchObject({ id: "i1", title: "Fast delivery", kind: "idea", state: "active", goalTitle: "Grow shop", projectTitle: "Delivery pilot", ventureTitle: "Corner shop", taskTitle: "Call three riders", taskDone: true });
    expect(d.searchText).toContain("delivery test"); expect(JSON.stringify(all)).toBe(before);
  });

  it("keeps namespaces isolated and filters query, lifecycle, type, relation and date locally", () => {
    const demo = rec("d1", "capture", { "capture.note": v("Demo secret", "demo") }, "demo");
    const docs = buildRecallIndex([goal, project, venture, task, idea, demo], "real");
    expect(docs.map((d) => d.id)).toEqual(["i1"]);
    expect(filterRecall(docs, { query: "corner", states: ["active"], kinds: ["idea"], ventureId: "v1", goalId: "p1", changedFrom: "2026-11-08", changedTo: "2026-11-08" })).toHaveLength(1);
    expect(filterRecall(docs, { query: "demo" })).toHaveLength(0);
    expect(filterRecall(docs, { states: ["archived"] })).toHaveLength(0);
  });

  it("defaults old captures truthfully to an Inbox note", () => {
    const old = rec("old", "capture", { "capture.note": v("Old thought") });
    expect(buildRecallIndex([old])[0]).toMatchObject({ title: "Old thought", state: "inbox", kind: "note", changedAt: old.createdAt });
  });

  it("suggests similar items for review without mutating or merging them", () => {
    const other = rec("i2", "capture", { "capture.title": v("Delivery test"), "capture.note": v("Test riders before spending") });
    const different = rec("i3", "capture", { "capture.title": v("Read a book") }); const rows = [idea, other, different]; const before = JSON.stringify(rows);
    expect(similarIdeas(buildRecallIndex(rows), "i1").map((x) => x.id)).toEqual(["i2"]); expect(JSON.stringify(rows)).toBe(before); expect(rows).toHaveLength(3);
  });

  it("validates inputs and same-namespace relation types", () => {
    expect(validateIdeaInput({ title: "A", note: "", state: "inbox", kind: "idea", tags: [] })).toBeNull();
    expect(validateIdeaInput({ title: "", note: "", state: "inbox", kind: "idea", tags: [] })).toBe("title_required");
    expect(validateIdeaInput({ title: "A", note: "", state: "bad", kind: "idea", tags: [] })).toBe("bad_state");
    expect(validateIdeaLink([goal, project], idea, "goal", "g1")).toBeNull();
    expect(validateIdeaLink([goal, project], idea, "goal", "p1")).toBe("wrong_link_type");
    expect(validateIdeaLink([rec("gd", "goal", { "goal.title": v("Demo", "demo") }, "demo")], idea, "goal", "gd")).toBe("other_namespace");
  });

  it("updates fields and links immutably, and derives append-only history", () => {
    const changed = withIdeaPatch(idea, { title: "Better delivery", note: "Small test", state: "waiting", kind: "plan", tags: ["pilot"], reviewOn: "2026-11-20", links: { goal: null, project: "p1", venture: "v1", task: "t1" } }, "2026-11-08T12:00:00.000Z");
    expect(idea.values["capture.title"]).toEqual(v("Fast delivery"));
    expect(changed.links?.goal).toBeUndefined(); expect(changed.values["capture.state"]).toEqual(v("waiting"));
    const raw = ideaEventRecord(changed, "state", "2026-11-08T12:00:00.000Z", "active → waiting", "active");
    const event = { ...raw, ns: "real", ownerId: "owner", schemaVersion: 6 } as TMRecord;
    expect(ideaHistory([event], idea.id, "real")[0]).toMatchObject({ action: "state", fromState: "active", toState: "waiting" });
  });
});
