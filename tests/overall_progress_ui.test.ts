// Overall progress card on Today and Journey: unknown with no tasks, text equivalent, gentle prompt, no red, goal creation fields.
import { beforeEach, describe, expect, it } from "vitest";
import { journey, today, intake } from "../src/ui/screens";
import { prefs, store } from "../src/ui/state";
import { FIELDS, fieldById } from "../src/catalog/fields";
import { readFileSync } from "node:fs";

const task = (id: string, extra: Record<string, unknown> = {}) => ({ id, entity: "task", ns: "demo", ownerId: "me", schemaVersion: 1, createdAt: "2026-10-26T00:00:00.000Z",
  values: { "task.title": { state: "value", value: id, label: "DEMO" }, ...extra } as never });
const done = { "task.done_on": { state: "value", value: "2026-10-26", label: "DEMO" } };

describe("overall progress card", () => {
  beforeEach(() => { localStorage.clear(); localStorage.setItem("tm:ui:lang", "en"); store.demo.clear(); store.real.clear(); document.body.innerHTML = ""; prefs.progressMode = "equal"; });
  it("no tasks: Unknown, not 0%, with a link to add a task", () => {
    document.body.appendChild(today());
    const c = document.querySelector<HTMLElement>("[data-overall=today]")!;
    expect(c.dataset.percent).toBe("unknown"); expect(c.textContent).toMatch(/Unknown/); expect(c.textContent).not.toMatch(/\b0%/);
    expect(c.querySelector("[data-ov-bar]")!.getAttribute("aria-label")).toMatch(/Unknown/);
  });
  it("with tasks: percent text, prompt, Journey shows it too; adding a task lowers it and explains neutrally", () => {
    store.demo.put(task("a", done) as never); store.demo.put(task("b", done) as never);
    document.body.appendChild(today());
    let c = document.querySelector<HTMLElement>("[data-overall=today]")!;
    expect(c.dataset.percent).toBe("100"); expect(c.querySelector("[data-overall-text]")!.textContent).toMatch(/100% — 2 of 2 tasks done/);
    expect(c.querySelector("[data-overall-prompt]")!.textContent).toMatch(/Are there more tasks left for this aim\?/);
    expect(c.querySelector("[data-overall-fall]")).toBeNull();
    store.demo.put(task("c") as never);
    document.body.innerHTML = ""; document.body.appendChild(journey());
    c = document.querySelector<HTMLElement>("[data-overall=journey]")!;
    expect(c.dataset.percent).toBe("67"); expect(c.dataset.trend).toBe("down");
    expect(c.querySelector("[data-overall-fall]")!.textContent).toMatch(/plan changed/);
  });
  it("size mode is a button choice that persists", () => {
    store.demo.put(task("a", { ...done, "task.minutes": { state: "value", value: 10, label: "DEMO" } }) as never); store.demo.put(task("b", { "task.minutes": { state: "value", value: 30, label: "DEMO" } }) as never);
    document.body.appendChild(today());
    document.querySelector<HTMLButtonElement>("[data-ov-mode=size]")!.click();
    expect(prefs.progressMode).toBe("size");
    document.body.innerHTML = ""; document.body.appendChild(today());
    expect(document.querySelector<HTMLElement>("[data-overall=today]")!.dataset.percent).toBe("25");
  });
  it("goal creation step offers manual or auto and a manual percent; task size exists", () => {
    document.body.appendChild(intake("6"));
    expect(document.getElementById("f-goal.progress_mode")).not.toBeNull(); expect(document.getElementById("f-goal.manual_percent")).not.toBeNull();
    expect(fieldById("task.size")!.options!.map((o) => o.code)).toEqual(["S", "M", "L"]);
    expect(FIELDS.some((f) => f.id === "goal.manual_percent")).toBe(true);
  });
  it("styles use tokens only: no red for the bar and no animation outside no-preference", () => {
    const css = readFileSync("src/ui/styles.css", "utf8"); const blk = css.slice(css.indexOf("/* overall progress card")).replace(/\/\*[\s\S]*?\*\//g, "");
    expect(blk).not.toMatch(/--danger|#[0-9a-f]{3,6}|\bred\b/i); expect(blk.replace(/@media \(prefers-reduced-motion:no-preference\)\{[^}]*\{[^}]*\}\}/, "")).not.toMatch(/transition|animation/);
  });
});
