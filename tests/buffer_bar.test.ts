// Q-12: buffer day in the backward plan and the buffer bar (own estimate + 25 percent, labelled ESTIMATE, Unknown if any step lacks minutes).
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { ROUTES, render } from "../src/app";
import { consentKv, store } from "../src/ui/state";
import { revokeConsent } from "../src/core/consent";
import { workBackBuffered } from "../src/core/backwardPlan";
import { bufferBar } from "../src/core/bufferBar";
import { resetBackward } from "../src/ui/backwardUi";
import { PACKS } from "../src/i18n/packs";
import type { FieldValue, TMRecord } from "../src/core/types";

const NOW = "2026-10-26T10:00:00.000Z";
const v = (x: unknown): FieldValue => ({ state: "value", value: x, label: "DEMO" } as FieldValue);
const goal = (id: string, extra: Record<string, unknown> = {}): TMRecord => ({ id, entity: "goal", ns: "demo", ownerId: "demo-user", schemaVersion: 2, createdAt: NOW, values: { "goal.title": v(id), ...Object.fromEntries(Object.entries(extra).map(([k, x]) => [k, v(x)])) } });
const task = (id: string, goals: string[], extra: Record<string, unknown> = {}): TMRecord => ({ id, entity: "task", ns: "demo", ownerId: "demo-user", schemaVersion: 2, createdAt: NOW, values: { "task.title": v(`step ${id}`), "task.goals": v(goals), ...Object.fromEntries(Object.entries(extra).map(([k, x]) => [k, v(x)])) } });

describe("core: buffer day", () => {
  it("off: same as workBack; on: the last step lands one day before the end date", () => {
    const off = workBackBuffered(["b", "a"], "2026-11-13", "2026-11-03", false); expect(off.buffer).toBe("off");
    const on = workBackBuffered(["b", "a"], "2026-11-13", "2026-11-03", true); expect(on.buffer).toBe("on");
    if (off.plan.kind !== "ok" || on.plan.kind !== "ok") throw new Error("plan");
    expect(off.plan.rows.at(-1)!.date).toBe("2026-11-13"); expect(on.plan.rows.at(-1)!.date).toBe("2026-11-12"); expect(on.freeDay).toBe("2026-11-13");
  });
  it("no room: end date is tomorrow, so nothing is moved and a calm note flag is returned; past or no date is not a room problem", () => {
    const r = workBackBuffered(["a"], "2026-11-04", "2026-11-03", true); expect(r.buffer).toBe("noroom"); expect(r.plan.kind === "ok" && r.plan.rows[0]!.date).toBe("2026-11-04");
    expect(workBackBuffered(["a"], "2026-11-03", "2026-11-03", true).buffer).toBe("off"); expect(workBackBuffered(["a"], "", "2026-11-03", true).buffer).toBe("off");
  });
});

describe("core: buffer bar", () => {
  it("own minutes plus 25 percent (rounded up); unknown if any step lacks minutes; nothing for no steps", () => {
    expect(bufferBar([30, 50])).toEqual({ kind: "ok", own: 80, extra: 20, total: 100 });
    expect(bufferBar([10])).toEqual({ kind: "ok", own: 10, extra: 3, total: 13 });
    expect(bufferBar([30, null])).toEqual({ kind: "unknown", missing: 1 }); expect(bufferBar([])).toEqual({ kind: "none" });
    expect(bufferBar([0, 0])).toEqual({ kind: "unknown", missing: 2 });
  });
});

const app = () => document.getElementById("app")!;
const q = <T extends Element>(s: string) => app().querySelector(s) as T | null;
const go = (hash: string) => { location.hash = hash; render(); };
const plus = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const click = (s: string) => { q<HTMLElement>(s)!.click(); render(); };
beforeEach(() => { localStorage.clear(); store.demo.clear(); store.real.clear(); revokeConsent(consentKv); resetBackward(); document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo"); });

const setup = (mins: Array<number | null>, end = plus(10)) => {
  store.demo.put(goal("g1", { "goal.target_date": end }));
  mins.forEach((m, i) => store.demo.put(task(`t${i}`, ["g1"], m === null ? {} : { "task.minutes": m })));
  go("#/journey/backward/g1"); mins.forEach((_, i) => click(`[data-bw-step=t${i}]`));
};

describe("screens", () => {
  it("toggle is off by default; turning it on moves the last step one day earlier and names the free day; no data is saved", () => {
    setup([30, 50]); const last = () => q<HTMLElement>("[data-bw-row=t0]")!.dataset.date;
    expect(q("[data-bw=buffer]")).not.toBeNull(); expect(last()).toBe(plus(10));
    click("[data-bw=buffer-toggle]"); expect(last()).toBe(plus(9)); expect(q("[data-bw=buffer-on]")!.textContent).toContain(plus(10));
    expect(store.demo.list().filter((r) => r.values["task.plan_by"])).toHaveLength(0);
    click("[data-bw=buffer-toggle]"); expect(last()).toBe(plus(10)); expect(q("[data-bw=buffer-on]")).toBeNull();
  });
  it("no room: calm note, dates stay on the end date", () => {
    setup([30], plus(1)); click("[data-bw=buffer-toggle]"); expect(q("[data-bw=buffer-noroom]")!.textContent).toMatch(/no room/i); expect(q<HTMLElement>("[data-bw-row=t0]")!.dataset.date).toBe(plus(1));
  });
  it("buffer bar: own estimate plus 25 percent labelled Estimate, with a text equivalent", () => {
    setup([30, 50]); const bar = q<HTMLElement>("[data-buffer-bar]")!; expect(bar.dataset.bufferBar).toBe("ok");
    expect(bar.textContent).toMatch(/80/); expect(bar.textContent).toMatch(/100/); expect(bar.textContent).toMatch(/Estimate/);
    expect(bar.querySelector("[data-seg=own]")).not.toBeNull(); expect(bar.querySelector("[data-seg=extra]")).not.toBeNull(); expect(bar.querySelector("[aria-hidden=true]")).not.toBeNull();
  });
  it("unknown if any step lacks minutes: no bar, no zero", () => {
    setup([30, null]); const bar = q<HTMLElement>("[data-buffer-bar]")!; expect(bar.dataset.bufferBar).toBe("unknown"); expect(bar.querySelector("[data-seg]")).toBeNull(); expect(bar.textContent).toMatch(/Unknown/);
  });
  it("EN and BN text exist for every new key", () => {
    const en = Object.keys(PACKS.en).filter((k) => k.startsWith("q3.")); expect(en.length).toBeGreaterThan(5);
    for (const k of en) expect((PACKS.bn as Record<string, string>)[k]).toBeTruthy();
  });
  it("routes still exist", () => { expect(ROUTES.some(([re]) => re.test("/journey/backward/g1"))).toBe(true); });
});
