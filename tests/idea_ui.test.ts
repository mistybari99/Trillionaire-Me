import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import type { FieldValue, TMRecord } from "../src/core/types";
import { consentKv, store } from "../src/ui/state";
import { revokeConsent } from "../src/core/consent";

const NOW = "2026-11-08T10:00:00.000Z";
const v = (value: unknown): FieldValue => ({ state: "value", value, label: "DEMO" });
const rec = (id: string, entity: string, values: TMRecord["values"], links?: Record<string, string>): TMRecord => ({ id, entity, ns: "demo", ownerId: "demo-user", schemaVersion: 6, createdAt: NOW, values, ...(links ? { links } : {}) });
const go = (hash: string) => { location.hash = hash; render(); };
const q = <T extends Element = HTMLElement>(s: string) => document.querySelector<T>(s)!;
const set = (id: string, value: string) => { (document.getElementById(id) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value = value; };

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); store.demo.clear(); store.real.clear(); revokeConsent(consentKv);
  document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:dataMode", "demo"); localStorage.setItem("tm:ui:lang", "en");
});

describe("Personal Idea & Plan Management UI", () => {
  it("captures into Inbox, records history, and creates exactly one linked next task", () => {
    go("#/capture"); set("cap-kind", "idea"); set("cap-note", "Test a neighborhood delivery plan"); q<HTMLButtonElement>("[data-act=capture-find]").click(); q<HTMLButtonElement>("[data-act=capture-note]").click();
    const idea = store.demo.list().find((r) => r.entity === "capture")!;
    expect(idea.values).toMatchObject({ "capture.kind": { value: "idea" }, "capture.state": { value: "inbox" } });
    expect(store.demo.list().filter((r) => r.entity === "idea_event")).toHaveLength(1);
    expect(q("[data-act=idea-organize]").getAttribute("href")).toBe(`#/recall/${idea.id}`);
    q<HTMLButtonElement>("[data-act=idea-next]").click(); q<HTMLButtonElement>("[data-act=idea-next]").click();
    expect(store.demo.list().filter((r) => r.entity === "task")).toHaveLength(1);
    expect(store.demo.get(idea.id)!.links?.task).toBe(store.demo.list().find((r) => r.entity === "task")!.id);
    expect(store.demo.get(idea.id)!.values["capture.state"]).toMatchObject({ value: "active" });
  });

  it("searches and filters active, paused and archived items without hiding their history", () => {
    store.demo.put(rec("i1", "capture", { "capture.title": v("Delivery pilot"), "capture.note": v("Call riders"), "capture.kind": v("plan"), "capture.state": v("paused"), "capture.changed_at": v("2026-11-08T09:00:00Z") }));
    store.demo.put(rec("i2", "capture", { "capture.title": v("Old shop note"), "capture.kind": v("note"), "capture.state": v("archived"), "capture.changed_at": v("2026-10-01T09:00:00Z") }));
    go("#/recall"); expect(document.querySelectorAll("[data-idea]")).toHaveLength(2);
    set("idea-search", "delivery"); q<HTMLInputElement>("#idea-search").dispatchEvent(new Event("input")); expect(document.querySelectorAll("[data-idea]")).toHaveLength(1); expect(q("[data-idea]").getAttribute("data-idea")).toBe("i1");
    set("idea-search", ""); q<HTMLInputElement>("#idea-search").dispatchEvent(new Event("input")); set("idea-filter-state", "archived"); q<HTMLSelectElement>("#idea-filter-state").dispatchEvent(new Event("change")); expect(q("[data-idea]").getAttribute("data-idea")).toBe("i2");
  });

  it("edits and connects an idea to existing venture, goal and project, preserving an event history", () => {
    store.demo.put(rec("v1", "venture", { "venture.name": v("Corner shop") }));
    store.demo.put(rec("g1", "goal", { "goal.title": v("Grow sales"), "goal.kind": v("goal") }));
    store.demo.put(rec("p1", "goal", { "goal.title": v("Delivery pilot"), "goal.kind": v("project") }, { parent: "g1" }));
    store.demo.put(rec("i1", "capture", { "capture.title": v("Delivery"), "capture.note": v("Try small"), "capture.kind": v("idea"), "capture.state": v("inbox"), "capture.changed_at": v(NOW) }));
    go("#/recall/i1"); set("idea-title", "Delivery test"); set("idea-state", "waiting"); set("idea-tags", "shop, test"); set("idea-review", "2026-11-20"); set("idea-venture", "v1"); set("idea-goal", "g1"); set("idea-project", "p1");
    q<HTMLFormElement>('form[data-form="idea"]').dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    const saved = store.demo.get("i1")!; expect(saved.links).toMatchObject({ venture: "v1", goal: "g1", project: "p1" }); expect(saved.values["capture.title"]).toMatchObject({ value: "Delivery test" }); expect(saved.values["capture.tags"]).toMatchObject({ value: ["shop", "test"] });
    expect(store.demo.list().filter((r) => r.entity === "idea_event" && r.links?.idea === "i1")).toHaveLength(1);
    q<HTMLButtonElement>("[data-act=idea-next-task]").click(); const task = store.demo.list().find((r) => r.entity === "task")!;
    expect(task.values["task.goals"]).toMatchObject({ value: ["p1"] }); expect(task.links?.goal).toBe("p1");
  });
});
