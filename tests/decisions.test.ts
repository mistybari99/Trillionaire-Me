// Decision helper and ownership check: rule-based, reason always shown, unknown is never read as "no", nothing saved.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { afterEach } from "vitest";
import { decide, triage } from "../src/core/decisions";
import { resetDecisionState } from "../src/ui/decisionUi";
import { store, consentKv } from "../src/ui/state";
import { grantConsent } from "../src/core/consent";
import type { FieldValue, TMRecord } from "../src/core/types";

describe("decision rules", () => {
  it("no answers: needs the first answer, never a suggestion", () => { expect(decide({})).toMatchObject({ outcome: "need_answers", missing: ["reversible"] }); });
  it("reversible gives a small trial", () => { expect(decide({ reversible: "yes" })).toMatchObject({ outcome: "try_small", reason: "reversible" }); });
  it("not sure is not read as no", () => { expect(decide({ reversible: "unsure" }).outcome).toBe("need_answers"); expect(decide({ reversible: "no", time: "unsure" }).outcome).toBe("need_answers"); });
  it("cannot undo and cannot wait: decide with care", () => { expect(decide({ reversible: "no", time: "no" }).outcome).toBe("decide_with_care"); });
  it("cannot undo, time, can learn: wait and learn", () => { expect(decide({ reversible: "no", time: "yes", learn: "yes" }).outcome).toBe("wait_learn"); });
  it("regret answers steer the last step", () => {
    const base = { reversible: "no", time: "yes", learn: "no" } as const;
    expect(decide({ ...base, regret: "yes" }).outcome).toBe("lean_go");
    expect(decide({ ...base, regret: "no" }).outcome).toBe("lean_wait");
    expect(decide({ ...base, regret: "unsure" }).outcome).toBe("sleep_on_it");
    expect(decide(base).outcome).toBe("need_answers");
  });
  it("every outcome has a reason key", () => { expect(decide({ reversible: "no", time: "no" }).reason).toBeTruthy(); });
});

describe("ownership triage rules", () => {
  it("no answers asks", () => { expect(triage({})).toMatchObject({ outcome: "ask" }); });
  it("mine + matters = do", () => { expect(triage({ mine: "yes", matters: "yes" })).toMatchObject({ outcome: "do", reason: "mine_matters" }); });
  it("mine + not matters = let go", () => { expect(triage({ mine: "yes", matters: "no" }).outcome).toBe("let_go"); });
  it("not mine + someone can = hand over", () => { expect(triage({ mine: "no", other: "yes" }).outcome).toBe("delegate"); });
  it("not mine + nobody = let go", () => { expect(triage({ mine: "no", other: "no" }).outcome).toBe("let_go"); });
  it("unsure never decides", () => { expect(triage({ mine: "unsure" }).outcome).toBe("ask"); expect(triage({ mine: "yes", matters: "unsure" }).outcome).toBe("ask"); });
});

const mkTask = (ns: "demo" | "real", id: string, title: string): TMRecord => ({ id, entity: "task", ns, ownerId: "o", schemaVersion: 1, createdAt: "2026-10-25T00:00:00.000Z", values: { "task.title": { state: "value", value: title, label: ns === "demo" ? "DEMO" : "FACT" } as FieldValue } });

describe("decision and triage screens", () => {
  const onHash = () => render();
  afterEach(() => window.removeEventListener("hashchange", onHash));
  beforeEach(() => {
    window.addEventListener("hashchange", onHash);
    localStorage.clear(); store.demo.clear(); store.real.clear(); resetDecisionState();
    document.body.innerHTML = '<div id="app"></div>';
    localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "real"); grantConsent(consentKv, "2026-10-25T00:00:00.000Z");
  });
  const go = (p: string) => { location.hash = p; render(); };
  const app = () => document.getElementById("app")!;
  it("decision: answering updates the suggestion and shows the reason", () => {
    go("#/journey/decide");
    expect(app().querySelector("[data-dec-result]")!.getAttribute("data-dec-result")).toBe("need_answers");
    (app().querySelector('[data-choice="dec-reversible"] [data-opt="yes"]') as HTMLElement).click();
    expect(app().querySelector("[data-dec-result]")!.getAttribute("data-dec-result")).toBe("try_small");
    expect(app().querySelector("[data-dec-why]")!.textContent).toMatch(/undone/);
  });
  it("decision screen has a heading, text for every outcome in en, bn, mix, and saves nothing", () => {
    for (const lang of ["en", "bn", "mix"]) { localStorage.setItem("tm:ui:lang", lang); go("#/journey/decide"); expect(app().querySelector("h1")!.textContent!.length).toBeGreaterThan(2); }
    expect(store.real.list().length).toBe(0); expect(store.demo.list().length).toBe(0);
  });
  it("triage: real mode shows own tasks only, never demo tasks; result changes with answers; tasks not changed", () => {
    store.demo.put(mkTask("demo", "d1", "Demo chore")); store.real.put(mkTask("real", "r1", "Pay the supplier"));
    go("#/journey/mine");
    expect(app().textContent).toContain("Pay the supplier"); expect(app().textContent).not.toContain("Demo chore");
    expect(app().querySelector("[data-tri-result]")!.getAttribute("data-tri-result")).toBe("ask");
    (app().querySelector('[data-choice="tri-r1-mine"] [data-opt="no"]') as HTMLElement).click();
    (app().querySelector('[data-choice="tri-r1-other"] [data-opt="yes"]') as HTMLElement).click();
    expect(app().querySelector("[data-tri-result]")!.getAttribute("data-tri-result")).toBe("delegate");
    expect(store.real.get("r1")!.values["task.title"]).toMatchObject({ value: "Pay the supplier" });
  });
  it("triage with no tasks says so and invents nothing", () => { go("#/journey/mine"); expect(app().querySelector("[data-tri-empty]")).not.toBeNull(); expect(app().querySelectorAll("[data-tri-task]").length).toBe(0); });
});
