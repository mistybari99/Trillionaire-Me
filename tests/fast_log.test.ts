// M13 fasting mark: content-free, one record per date, tap to mark and tap again to undo. No counts or streaks.
import { beforeEach, describe, expect, it } from "vitest";
import { fastLogId, fastLogRecord, isFastMarked } from "../src/core/fastLog";
import { render } from "../src/app";
import { store } from "../src/ui/state";

describe("fasting mark (M13)", () => {
  it("one record per date; reads only real dated values", () => {
    const r = fastLogRecord("2026-10-24", "2026-10-24T00:00:00Z");
    expect(r.id).toBe(fastLogId("2026-10-24"));
    expect(r.entity).toBe("fast");
    expect(r.values["fast.date"]).toEqual({ state: "value", value: "2026-10-24", label: "DEMO" });
    expect(isFastMarked([r], "2026-10-24")).toBe(true);
    expect(isFastMarked([r], "2026-10-25")).toBe(false);
    expect(isFastMarked([{ ...r, values: { "fast.date": { state: "unknown" } } }], "2026-10-24")).toBe(false);
  });
});

describe("fasting mark on the Deen screen", () => {
  beforeEach(() => { localStorage.clear(); store.demo.clear(); document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); });
  it("tap marks today; tap again removes only that mark; no count or streak is shown", () => {
    location.hash = "#/deen"; render();
    const btn = () => document.querySelector<HTMLButtonElement>("[data-act='fast-mark']")!;
    expect(btn().getAttribute("aria-pressed")).toBe("false");
    btn().click(); render();
    expect(store.demo.list().filter((r) => r.entity === "fast")).toHaveLength(1);
    expect(btn().getAttribute("aria-pressed")).toBe("true");
    btn().click(); render();
    expect(store.demo.list().filter((r) => r.entity === "fast")).toHaveLength(0);
    const card = document.querySelector("[data-fast]")!.textContent ?? "";
    expect(card).not.toMatch(/streak|rank|score/i);
  });
});
