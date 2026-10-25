import { beforeEach, describe, expect, it } from "vitest";
import { STAGE_CODES, StageError, conditions, currentIndex, passStage, stageStates } from "../src/core/stages";
import { FIELDS } from "../src/catalog/fields";
import type { Answers } from "../src/core/intake";
import { render } from "../src/app";
import { store } from "../src/ui/state";
import type { FieldValue, TMRecord } from "../src/core/types";

const v = (x: unknown): FieldValue => ({ state: "value", value: x, label: "DEMO" });
const requiredAnswered = (): Answers => { const a: Answers = {}; for (const f of FIELDS.filter((x) => x.step > 0 && x.requirement === "required")) a[f.id] = { state: "later" }; return a; };

describe("TM-TST-166 stage rules", () => {
  it("Stage A is not passable until required diary questions are addressed AND a goal exists", () => {
    expect(() => passStage({ answers: {}, goalCount: 0 }, [], "A", "")).toThrow(StageError);
    expect(() => passStage({ answers: requiredAnswered(), goalCount: 0 }, [], "A", "")).toThrow(/not met/);
    expect(() => passStage({ answers: {}, goalCount: 1 }, [], "A", "")).toThrow(/not met/);
    expect(passStage({ answers: requiredAnswered(), goalCount: 1 }, [], "A", "").code).toBe("A");
  });
  it("order is fixed: only the current stage can be passed", () => {
    for (const bad of ["B", "C", "H"] as const) expect(() => passStage({ answers: requiredAnswered(), goalCount: 1 }, [], bad, "evidence")).toThrow(/current stage/);
    expect(() => passStage({ answers: {}, goalCount: 0 }, ["A"], "A", "x")).toThrow(/current stage/); // cannot re-pass or rewrite history
  });
  it("stages after A need the user's own evidence; empty evidence is refused", () => {
    expect(() => passStage({ answers: {}, goalCount: 0 }, ["A"], "B", "  ")).toThrow(/evidence/);
    expect(passStage({ answers: {}, goalCount: 0 }, ["A"], "B", "first paid job done").code).toBe("B");
  });
  it("states: done / now / locked, exactly one 'now' until everything is done", () => {
    for (let n = 0; n <= 8; n++) {
      const passed = STAGE_CODES.slice(0, n); const st = stageStates(passed);
      expect(st.filter((x) => x === "now").length).toBe(n === 8 ? 0 : 1); expect(st.filter((x) => x === "done").length).toBe(n); expect(currentIndex(passed)).toBe(n);
    }
    expect(() => passStage({ answers: {}, goalCount: 0 }, [...STAGE_CODES], "H", "x")).toThrow(/all stages/);
  });
  it("unmet conditions are plain data (met:false), with bilingual text", () => {
    for (const c of conditions({ answers: {}, goalCount: 0 }, "A")) { expect(c.met).toBe(false); expect(c.text.bn.length).toBeGreaterThan(5); expect(c.text.en.length).toBeGreaterThan(5); }
  });
  it("no punishing/shaming copy in stage or log strings", async () => {
    const { PACKS } = await import("../src/i18n/packs");
    const txt = Object.entries(PACKS.en).filter(([k]) => /^(stage|log)\./.test(k)).map(([, x]) => x).join(" ").toLowerCase();
    expect(txt).not.toMatch(/fail|late|overdue|missed|behind|lazy|shame|penalt/);
  });
});

describe("journey screens", () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); store.demo.clear(); document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); });
  const go = (h: string) => { location.hash = h; render(); };
  const rec = (id: string, entity: string, values: Record<string, FieldValue>): TMRecord => ({ id, entity, ns: "demo", ownerId: "u", schemaVersion: 1, createdAt: "2026-10-24T00:00:00Z", values });
  it("fresh start: Stage A is current, pass button disabled, nothing in the log", () => {
    go("#/journey");
    expect(document.querySelector("[data-stage-panel]")!.getAttribute("data-stage-panel")).toBe("A");
    expect((document.querySelector("[data-act=pass-stage]") as HTMLButtonElement).disabled).toBe(true);
    go("#/journey/log"); expect(document.querySelectorAll("[data-log]").length).toBe(0);
  });
  it("meeting the conditions enables the button; passing writes a stage_pass + log and opens Stage B; Home shows 2/8", () => {
    const a: Record<string, FieldValue> = {}; for (const f of FIELDS.filter((x) => x.step > 0 && x.requirement === "required")) a[f.id] = { state: "later" };
    store.demo.put(rec("intake-all", "profile", a));
    store.demo.put(rec("intake-goal", "goal", { "goal.title": v("Steady income") }));
    go("#/journey");
    const btn = document.querySelector("[data-act=pass-stage]") as HTMLButtonElement; expect(btn.disabled).toBe(false);
    btn.click(); render(); // main.ts listens to hashchange in the real app; tests re-render by hand
    expect(store.demo.list().some((r) => r.id === "stagepass-A")).toBe(true);
    expect(document.querySelector("[data-passed='A']")).not.toBeNull();
    expect(document.querySelector("[data-stage-panel]")!.getAttribute("data-stage-panel")).toBe("B");
    go("#/journey/log"); expect(document.querySelectorAll("[data-log]").length).toBe(1);
    go("#/today"); expect(document.body.textContent).toMatch(/Stage 2 \/ 8/);
  });
  it("a secret in the evidence is rejected and nothing is written", () => {
    store.demo.put(rec("stagepass-A", "stage_pass", { "stage_pass.stage_code": v("A") }));
    go("#/journey");
    (document.getElementById("st-evidence") as HTMLTextAreaElement).value = "password: abc12345";
    (document.querySelector("[data-act=pass-stage]") as HTMLButtonElement).click();
    expect(store.demo.list().some((r) => r.id === "stagepass-B")).toBe(false);
  });
});
