// Block 5: rule-based advice cards, wider knowledge fields, online-suggestion slot (off), free-cloud sync option (off).
import "fake-indexeddb/auto";
import { readFileSync, readdirSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "../src/app";
import { store, consentKv } from "../src/ui/state";
import { grantConsent } from "../src/core/consent";
import type { FieldValue, Namespace, TMRecord } from "../src/core/types";
import { MANY_OPEN_TASKS, adviceCards } from "../src/core/advice";
import { createRegistry } from "../src/adapters/registry";
import { onlineSuggestion } from "../src/adapters/onlineAdvice";
import { MemoryKV } from "../src/core/store";
import { TOPICS } from "../src/library/topics";
import { validatePack } from "../src/library/packs";
import { PACKS, type Key } from "../src/i18n/packs";

const NOW = "2026-10-31T00:00:00.000Z";
const mk = (ns: Namespace, id: string, entity: string, values: Record<string, unknown>, links?: Record<string, string>): TMRecord => {
  const label = ns === "demo" ? "DEMO" : "FACT"; const vals: Record<string, FieldValue> = {};
  for (const [k, x] of Object.entries(values)) vals[k] = (x === null ? { state: "unknown" } : { state: "value", value: x, label }) as FieldValue;
  return { id, entity, ns, ownerId: "demo-user", schemaVersion: 1, createdAt: NOW, values: vals, ...(links ? { links } : {}) };
};
const app = () => document.getElementById("app")!;
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); store.demo.clear(); store.real.clear();
  document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo"); grantConsent(consentKv, NOW);
});

describe("adviceCards (pure)", () => {
  it("no entries: no cards", () => expect(adviceCards([])).toEqual([]));
  it("goal without a task, risks without a stop rule, unknown money amounts: one card each, built-in provenance, reviewer pending", () => {
    const recs = [mk("demo", "g", "goal", { "goal.title": "Shop" }), mk("demo", "r", "risk", { "risk.text": "Rain" }), mk("demo", "f", "finance_item", { "finance.kind": "expense", "finance.scope": "personal", "finance.label": "Rent", "finance.amount": null })];
    const cards = adviceCards(recs);
    expect(cards.map((c) => c.rule)).toEqual(["goal_no_task", "risk_no_stop_rule", "money_unknown"]);
    expect(cards[0]!.args.goal).toBe("Shop");
    for (const c of cards) { expect(c.provenance).toEqual({ kind: "builtin", source: "general", reviewer: "pending" }); expect(TOPICS.some((x) => x.id === c.topic)).toBe(true); }
  });
  it("many open tasks triggers at the threshold only; at most 3 cards", () => {
    const tasks = (n: number) => Array.from({ length: n }, (_, i) => mk("demo", `t${i}`, "task", { "task.title": `T${i}` }));
    expect(adviceCards(tasks(MANY_OPEN_TASKS - 1)).some((c) => c.rule === "many_open_tasks")).toBe(false);
    expect(adviceCards(tasks(MANY_OPEN_TASKS)).find((c) => c.rule === "many_open_tasks")!.args.n).toBe(String(MANY_OPEN_TASKS));
    const all = [...tasks(9), mk("demo", "g", "goal", { "goal.title": "G" }), mk("demo", "r", "risk", { "risk.text": "x" }), mk("demo", "f", "finance_item", { "finance.kind": "expense", "finance.scope": "personal", "finance.amount": null })];
    expect(adviceCards(all).length).toBe(3);
  });
});

describe("advice card on Today", () => {
  it("each card shows its reason, a draft note and no amounts or percents; empty start shows none", () => {
    location.hash = "#/today"; render();
    expect(app().querySelector("[data-advice]")).toBeNull();
    store.demo.put(mk("demo", "g", "goal", { "goal.title": "Shop" })); store.demo.put(mk("demo", "r", "risk", { "risk.text": "Rain" }));
    render();
    const items = [...app().querySelectorAll("[data-advice-rule]")];
    expect(items.length).toBe(2);
    for (const it of items) { expect(it.querySelector("[data-advice-reason]")!.textContent!.length).toBeGreaterThan(10); expect(it.querySelector("[data-advice-prov]")!.getAttribute("data-advice-prov")).toBe("builtin/general/pending"); expect(it.textContent).not.toMatch(/[%৳$]|BDT|Tk/); }
  });
  it("same advice keys exist in English, Bangla and Mix", () => {
    const keys = Object.keys(PACKS.en).filter((k) => k.startsWith("advice.") || k.endsWith(".slot")) as Key[];
    expect(keys.length).toBeGreaterThanOrEqual(15);
    for (const k of keys) { expect(PACKS.bn[k], k).toBeTruthy(); expect(PACKS.mix[k], k).toBeTruthy(); }
  });
});

describe("online suggestions slot and free-cloud option stay OFF", () => {
  it("makes no call and answers not connected while off, even with a key stored; shows the slot text in Connections", async () => {
    const kv = new MemoryKV(); const reg = createRegistry(kv);
    const ask = vi.fn(); const fetchSpy = vi.fn(); vi.stubGlobal("fetch", fetchSpy);
    const r = await onlineSuggestion(reg, { topic: "money" });
    expect(r).toMatchObject({ ok: false, reason: "not_connected" }); expect(ask).not.toHaveBeenCalled(); expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
    location.hash = "#/more/connections"; render();
    expect(app().querySelector("[data-conn-slot=cloudSync]")!.textContent).toContain("Saved on this device");
    expect(app().querySelector("[data-conn-slot=aiAssistant]")).not.toBeNull();
    expect(app().querySelector("[data-conn=cloudSync]")!.getAttribute("data-conn-status")).toBe("off");
    expect(app().querySelector("[data-conn=aiAssistant]")!.getAttribute("data-conn-status")).toBe("off");
  });
});

describe("wider offline knowledge", () => {
  const dir = "public/content";
  const packs = readdirSync(dir).filter((f) => /^pack-\d+\.json$/.test(f)).map((f) => ({ f, raw: JSON.parse(readFileSync(`${dir}/${f}`, "utf8")) }));
  it("every pack validates, is pending reviewer, and every entry carries kind and reviewer pending", () => {
    expect(packs.length).toBeGreaterThanOrEqual(8);
    const reserved = new Set<string>();
    for (const { f, raw } of packs) {
      const r = validatePack(raw, new Set()); expect(r.ok, f + (r.ok ? "" : r.errors.join(";"))).toBe(true);
      expect(raw.reviewStatus).toBe("pending_reviewer");
      if (f >= "pack-008.json") for (const tip of raw.tips) { expect(tip.kind, tip.id).toBeTruthy(); expect(tip.reviewer, tip.id).toBe("pending"); expect(reserved.has(tip.id), tip.id).toBe(false); reserved.add(tip.id); }
    }
  });
  it("pack-008 adds at least 20 entries across topics that had few, all with learn-kind entries naming a kind of source", () => {
    const p = packs.find((x) => x.f === "pack-008.json")!.raw; expect(p.tips.length).toBeGreaterThanOrEqual(20);
    expect(new Set(p.tips.map((x: { topic: string }) => x.topic)).size).toBeGreaterThanOrEqual(8);
    const learn = p.tips.filter((x: { kind: string }) => x.kind === "learn"); expect(learn.length).toBeGreaterThanOrEqual(3);
    for (const l of learn) expect(["general", "wikipedia", "reviewer"]).toContain(l.source);
  });
});
