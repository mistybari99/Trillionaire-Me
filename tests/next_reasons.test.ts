import { describe, expect, it } from "vitest";
import { nextActions, nextBestAction } from "../src/core/nextAction";
import type { FieldValue, Namespace, TMRecord } from "../src/core/types";

const TODAY = "2026-11-13";
const v = (value: unknown): FieldValue => ({ state: "value", value, label: "DEMO" });
const rec = (id: string, entity: string, values: Record<string, FieldValue>, links?: Record<string, string>, ns: Namespace = "demo"): TMRecord =>
  ({ id, entity, ns, ownerId: "u", schemaVersion: 6, createdAt: "2026-11-01T00:00:00Z", values, ...(links ? { links } : {}) });
const task = (id: string, title: string, extra: Record<string, FieldValue> = {}, links?: Record<string, string>, ns: Namespace = "demo") => rec(id, "task", { "task.title": v(title), ...extra }, links, ns);
const idea = (id: string, title: string, state: string, review?: string, ns: Namespace = "demo") =>
  rec(id, "capture", { "capture.title": v(title), "capture.state": v(state), ...(review ? { "capture.review_on": v(review) } : {}) }, undefined, ns);

describe("nextActions (TMV2-04)", () => {
  it("blocker: names the open step that holds another step; none when it is done or missing", () => {
    const a = task("t-a", "Write offer"), b = task("t-b", "Send offer", {}, { after: "t-a" });
    expect(nextActions([a, b], TODAY)).toEqual([{ reason: "blocker", target: "task", id: "t-a", href: "#/diary/plan", args: { title: "Write offer", other: "Send offer" } }]);
    expect(nextActions([task("t-a", "Write offer", { "task.done_on": v("2026-11-10") }), b], TODAY)).toEqual([]);
    expect(nextActions([task("t-b", "Send offer", {}, { after: "ghost" })], TODAY)).toEqual([]);
  });
  it("mutual wait shows once and never loops", () => {
    const r = nextActions([task("t-a", "A", {}, { after: "t-b" }), task("t-b", "B", {}, { after: "t-a" })], TODAY);
    expect(r).toHaveLength(1);
  });
  it("waiting: delegated step, waiting idea, paused venture; done/archived give none", () => {
    const recs = [task("t-d", "Ask supplier", { "task.delegated_on": v("2026-11-02") }), idea("i-w", "Wait for quote", "waiting"), idea("i-x", "Old", "archived"),
      rec("v-1", "venture", { "venture.name": v("Corner shop"), "venture.stage": v("paused") }), rec("v-2", "venture", { "venture.name": v("Running"), "venture.stage": v("running") })];
    expect(nextActions(recs, TODAY).map((s) => [s.reason, s.id])).toEqual([["waiting", "i-w"], ["waiting", "t-d"], ["waiting", "v-1"]]);
  });
  it("review_due: today or earlier counts; future and Unknown never do; done is skipped", () => {
    const recs = [idea("i-1", "Past", "paused", "2026-11-01"), idea("i-2", "Today", "inbox", TODAY), idea("i-3", "Future", "inbox", "2026-12-01"), idea("i-4", "Unknown", "inbox"), idea("i-5", "Done", "done", "2026-11-01")];
    expect(nextActions(recs, TODAY).map((s) => s.id)).toEqual(["i-1", "i-2"]);
  });
  it("orders blocker, review_due, waiting; caps at 3; stable under shuffle; one per record", () => {
    const recs = [task("t-a", "A"), task("t-b", "B", {}, { after: "t-a" }), task("t-c", "C", {}, { after: "t-a" }), idea("i-1", "Rev", "inbox", "2026-11-05"), idea("i-w", "Wait", "waiting"), task("t-d", "D", { "task.delegated_on": v("x") })];
    const r1 = nextActions(recs, TODAY), r2 = nextActions([...recs].reverse(), TODAY);
    expect(r1.map((s) => s.reason)).toEqual(["blocker", "review_due", "waiting"]); expect(r2).toEqual(r1);
    expect(new Set(r1.map((s) => s.id)).size).toBe(r1.length); expect(nextActions(recs, TODAY).length).toBeLessThanOrEqual(3);
  });
  it("skipIds leaves out the recommended task", () => {
    const recs = [task("t-a", "A"), task("t-b", "B", {}, { after: "t-a" })]; expect(nextActions(recs, TODAY, undefined, ["t-a"])).toEqual([]);
  });
  it("keeps demo and real separate", () => {
    const recs = [idea("i-demo", "Demo idea", "waiting"), idea("i-real", "Real idea", "waiting", undefined, "real"), task("t-r", "Real step", {}, { after: "i-demo" }, "real")];
    expect(nextActions(recs, TODAY, "demo").map((s) => s.id)).toEqual(["i-demo"]);
    expect(nextActions(recs, TODAY, "real").map((s) => s.id)).toEqual(["i-real"]);
  });
  it("writes nothing and works offline; single-action API unchanged", () => {
    const recs = Object.freeze([Object.freeze(idea("i-1", "Rev", "inbox", "2026-11-05"))]) as unknown as TMRecord[];
    const before = JSON.stringify(recs); const f = globalThis.fetch; globalThis.fetch = (() => { throw new Error("offline"); }) as typeof fetch;
    try { expect(nextActions(recs, TODAY)).toHaveLength(1); } finally { globalThis.fetch = f; }
    expect(JSON.stringify(recs)).toBe(before); expect(nextBestAction([]).id).toBe("add_goal");
  });
});

// ---- UI: Today shows calm reason lines, read-only, in every language, demo/real isolated ----
import "fake-indexeddb/auto";
import { beforeEach } from "vitest";
import { render } from "../src/app";
import { consentKv, store } from "../src/ui/state";
import { revokeConsent } from "../src/core/consent";
import { t } from "../src/i18n/t";
import type { Key } from "../src/i18n/packs";

const go = (hash: string) => { location.hash = hash; render(); };
const SHAME = /\b(late|overdue|failed|behind|missed)\b|ব্যর্থ|দেরি|পিছিয়ে/i;
const seedUi = () => {
  store.demo.put(idea("i-w", "Wait for quote", "waiting")); store.demo.put(idea("i-r", "Revisit pricing", "inbox", "2020-01-01"));
  store.demo.put(task("t-a", "Write offer")); store.demo.put(task("t-b", "Send offer", {}, { after: "t-a" }));
};
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); store.demo.clear(); store.real.clear(); revokeConsent(consentKv); document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:dataMode", "demo"); });

describe("Today reason lines", () => {
  for (const lang of ["en", "bn", "mix"] as const) it(`renders up to 3 read-only reasons in ${lang}, calm wording, no real data`, () => {
    localStorage.setItem("tm:ui:lang", lang); seedUi(); const before = JSON.stringify(store.demo.list()); const count = store.demo.list().length;
    go("#/today");
    const box = document.querySelector("[data-next-more]")!; expect(box).toBeTruthy();
    expect(document.querySelectorAll("[data-next-more-reason]").length).toBe(3);
    expect(document.querySelectorAll("[data-next-action]").length).toBeLessThanOrEqual(1);
    expect(box.querySelectorAll("button").length).toBe(0);
    expect(box.textContent).not.toMatch(SHAME); expect(box.textContent).not.toMatch(/[%৳$]|BDT/);
    expect(box.textContent).toContain("Revisit pricing");
    expect(JSON.stringify(store.demo.list())).toBe(before); expect(store.demo.list().length).toBe(count);
  });
  it("shows nothing when no reason applies", () => { localStorage.setItem("tm:ui:lang", "en"); go("#/today"); expect(document.querySelector("[data-next-more]")).toBeNull(); });
  it("keeps keys non-empty with equal placeholders in en/bn/mix", () => {
    const keys = ["title", "blocker.title", "blocker.reason", "review_due.title", "review_due.reason", "waiting.title", "waiting.reason", "open", "note"].map((k) => `next.more.${k}` as Key);
    for (const k of keys) { const e = t(k, "en"), b = t(k, "bn"), m = t(k, "mix"); expect(e && b && m).toBeTruthy(); expect((e.match(/\{\w+\}/g) ?? []).sort()).toEqual((b.match(/\{\w+\}/g) ?? []).sort()); }
  });
});
