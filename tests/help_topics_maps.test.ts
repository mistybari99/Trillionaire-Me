import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TMRecord } from "../src/core/types";
const source = vi.hoisted(() => { vi.resetModules(); return { ns: "demo" as "demo" | "real", consent: false, locked: false, records: [] as TMRecord[], reads: vi.fn() }; });
vi.mock("../src/ui/entry", () => ({ activeNs: () => source.ns, realConsent: () => source.consent, allRecs: () => { source.reads(); return source.records; }, nsTag: (ns: string) => { const el = document.createElement("span"); el.dataset.ns = ns; el.textContent = ns; return el; } }));
vi.mock("../src/ui/lockUi", () => ({ isLocked: () => source.locked }));
import { HELP_TOPIC_IDS, getHelpTopic, renderGuide } from "../src/ui/helpTopics";
import { helpMapRecords, renderOwnMap } from "../src/ui/helpOwnMaps";
const record = (id: string, entity: string, data: Record<string, unknown>, ns: TMRecord["ns"] = "demo", links?: Record<string, string>): TMRecord => ({ id, entity, ns, ownerId: "test", schemaVersion: 2, createdAt: "2026-11-06T00:00:00Z", values: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, value === undefined ? { state: "unknown" } : { state: "value", value, label: ns === "demo" ? "DEMO" : "FACT" }])), links });
beforeEach(() => { source.ns = "demo"; source.consent = false; source.locked = false; source.records = []; source.reads.mockClear(); });
describe("static help guides", () => {
  it("has thirteen real localized guides; illustrations never contain words or data", () => {
    expect(HELP_TOPIC_IDS).toHaveLength(13);
    for (const topic of HELP_TOPIC_IDS) for (const lang of ["en", "bn", "mix"] as const) {
      expect(getHelpTopic(topic).id).toBe(topic);
      const plain = renderGuide(topic, lang, "diagram"), illustrated = renderGuide(topic, lang, "illustrated");
      expect(plain.querySelectorAll(".help-diagram>li").length).toBeGreaterThanOrEqual(3);
      expect(plain.querySelector("[data-help-example=fictional]")?.textContent).toBeTruthy();
      expect(plain.querySelector("svg")).toBeNull();
      expect(illustrated.querySelectorAll("svg")).toHaveLength(1);
      expect(illustrated.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
      expect(illustrated.querySelector("svg text")).toBeNull();
    }
    expect(source.reads).not.toHaveBeenCalled();
  });
});
describe("lazy private own-data maps", () => {
  it("never reads data for unsupported, locked, missing-consent or health-restricted views", () => {
    expect(renderOwnMap("settings", "en").dataset.helpMapState).toBe("unsupported");
    source.locked = true; expect(renderOwnMap("goals", "en").dataset.helpMapState).toBe("locked");
    source.locked = false; source.ns = "real";
    expect(renderOwnMap("money", "en").dataset.helpMapState).toBe("consent");
    source.consent = true;
    expect(renderOwnMap("profile", "en", { fieldId: "profile.health_note" }).dataset.helpMapState).toBe("restricted");
    expect(source.reads).not.toHaveBeenCalled();
  });
  it("empty means unknown, never a fabricated 0% or example data", () => {
    const map = renderOwnMap("goals", "en");
    expect(map.dataset.helpMapState).toBe("empty");
    expect(map.textContent).toContain("No relevant entries yet");
    expect(map.textContent).not.toContain("0%");
    expect(map.querySelector("[data-help-example]")).toBeNull();
  });
  it("filters the inactive namespace even if a data adapter returns mixed records", () => {
    source.records = [record("d", "goal", { "goal.title": "Demo-only" }), record("r", "goal", { "goal.title": "Private-real" }, "real")];
    expect(renderOwnMap("goals", "en").textContent).not.toContain("Private-real");
    source.ns = "real"; source.consent = true;
    const map = renderOwnMap("goals", "en");
    expect(map.textContent).toContain("Private-real"); expect(map.textContent).not.toContain("Demo-only");
    expect(map.querySelector("[data-ns]")?.getAttribute("data-ns")).toBe("real");
  });
  it("preserves all linked task and goal IDs without truncating long titles", () => {
    const title = "অনেক লম্বা গোলের পুরো নাম ".repeat(12);
    source.records = [record("g", "goal", { "goal.title": title }), ...Array.from({ length: 35 }, (_, i) => record(`t${i}`, "task", { "task.title": `Step ${i}`, "task.goals": ["g"] }))];
    const map = renderOwnMap("goals", "bn");
    expect(map.querySelectorAll("[data-help-record]")).toHaveLength(36);
    expect(map.textContent).toContain(title);
    expect(map.querySelector("[data-label=INFERENCE]")?.textContent).toContain("0%"); // known 0 of 35, not missing data
  });
  it("scopes a task to all linked goals, without changing source records", () => {
    source.records = [record("a", "goal", { "goal.title": "First" }), record("b", "goal", { "goal.title": "Second" }), record("t", "task", { "task.title": "Shared", "task.goals": ["a", "b"] })];
    const before = JSON.stringify(source.records);
    const map = renderOwnMap("goals", "en", { recordId: "t" });
    expect(map.textContent).toContain("First"); expect(map.textContent).toContain("Second");
    expect(map.textContent).toContain("counts once");
    expect(JSON.stringify(source.records)).toBe(before);
    expect(renderOwnMap("goals", "en", { recordId: "other-namespace-id" }).dataset.helpMapState).toBe("unavailable");
  });
  it("retains unknown money amounts and separate scopes", () => {
    source.records = [record("p", "finance_item", { "finance.label": "Personal item", "finance.scope": "personal", "finance.kind": "income", "finance.period": "monthly", "finance.amount": undefined }), record("b", "finance_item", { "finance.label": "Business item", "finance.scope": "business", "finance.kind": "income", "finance.period": "monthly", "finance.amount": 25 })];
    const map = renderOwnMap("money", "en");
    expect(map.dataset.helpMapState).toBe("ready"); expect(map.textContent).toContain("Unknown");
    expect(map.textContent).toContain("Personal"); expect(map.textContent).toContain("Business");
    expect(map.querySelector('[data-help-record="p"]')?.querySelector("[data-unknown]")).not.toBeNull();
  });
  it("shows prayer links and historical marks, never worship percentages", () => {
    source.records = [record("pr1", "prayer_log", { "prayer_log.date": "2026-11-01" }, "demo", { prayer: "fajr" }), record("pr2", "prayer_log", { "prayer_log.date": "2026-11-02" }, "demo", { prayer: "isha" }), record("fast", "fast", { "fast.date": "2026-11-03" })];
    const map = renderOwnMap("deen", "en");
    expect(map.querySelectorAll("[data-help-record]")).toHaveLength(3);
    expect(map.textContent).toContain("Fajr"); expect(map.textContent).toContain("Isha"); expect(map.textContent).not.toContain("%");
    const scoped = renderOwnMap("deen", "en", { recordId: "pr2" });
    expect(scoped.textContent).toContain("Isha"); expect(scoped.textContent).not.toContain("Fajr");
  });
  it("strips sensitive fields from generic context, including mixed records", () => {
    const r = record("p", "profile", { "profile.display_name": "Allowed", "profile.health_note": "Never cross-surface health" });
    const safe = helpMapRecords("profile", [r]);
    expect(safe[0]?.values["profile.health_note"]).toBeUndefined();
    source.records = [r]; expect(renderOwnMap("profile", "en").textContent).not.toContain("Never cross-surface health");
    expect(r.values["profile.health_note"]?.state).toBe("value");
  });
  it("shows habitual days and check-ins through existing completion semantics", () => {
    source.records = [record("h", "habit", { "habit.title": "Walk", "habit.days": "1,3", "habit.target": 2, "habit.unit": "rounds" }), record("l", "habit_log", { "habit_log.date": "2026-11-01", "habit_log.count": 2 }, "demo", { habit: "h" })];
    const map = renderOwnMap("habits", "en");
    expect(map.textContent).toContain("Mon, Wed"); expect(map.textContent).toContain("This check-in records completion");
    expect(map.querySelector('[data-help-record="l"]')).not.toBeNull();
  });
  it("keeps unknown manual progress unknown and preserves its actual provenance", () => {
    source.records = [record("g", "goal", { "goal.title": "Manual goal", "goal.progress_mode": "manual", "goal.manual_percent": undefined })];
    expect(renderOwnMap("goals", "en").textContent).not.toContain("0%");
    source.records[0]!.values["goal.manual_percent"] = { state: "value", value: 35, label: "FACT" };
    const map = renderOwnMap("goals", "en");
    expect(map.querySelector("[data-label=FACT]")?.textContent).toContain("35%");
  });
  it("retains incomplete goal IDs and dangling task links without invented counts", () => {
    source.records = [record("missing-title", "goal", { "goal.title": undefined }), record("t", "task", { "task.title": "Step", "task.goals": ["missing-title", "deleted"] })];
    const map = renderOwnMap("goals", "en");
    expect(map.dataset.helpMapState).toBe("ready"); expect(map.querySelector('[data-help-record="missing-title"]')).not.toBeNull();
    const scoped = renderOwnMap("goals", "en", { recordId: "t" });
    expect(scoped.dataset.helpMapState).toBe("ready"); expect(scoped.querySelector('[data-help-record="deleted"]')).not.toBeNull();
    expect(scoped.textContent).not.toContain("0%");
  });
  it("uses truthful failure fallback without leaking the exception or stale record nodes", () => {
    source.reads.mockImplementationOnce(() => { throw new Error("private secret data"); });
    const map = renderOwnMap("goals", "en");
    expect(map.dataset.helpMapState).toBe("error"); expect(map.textContent).not.toContain("private secret data"); expect(map.querySelector("[data-help-record]")).toBeNull();
  });
});
