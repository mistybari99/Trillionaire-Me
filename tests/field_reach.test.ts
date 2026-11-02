// Field reach (owner order 2 Nov 2026): a catalog field must not be "stored but never shown", and must not have no way to be typed.
// Part A (input): a field needs a place to type it (a progressive-intake step, or a form in src/ui that names it).
// Part B (shown): every text / number field is written with a unique marker into the demo store, then every screen is drawn;
//   a marker that appears nowhere is "stored but never shown".
// Fields that fail today are listed in NOT_SHOWN / NO_INPUT with the module that owns them. The lists can only shrink:
// a field that is now shown or typable but still listed fails the test, and so does a "complete" module that owns a listed field.
import "fake-indexeddb/auto";
import { beforeAll, describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { render } from "../src/app";
import { preloadLazy } from "../src/ui/lazy";
import { FIELDS } from "../src/catalog/fields";
import { entityById } from "../src/schema/entities";
import { MODULES, buildLabel } from "../src/modules/capability";
import { consentKv, store } from "../src/ui/state";
import { grantConsent } from "../src/core/consent";
import type { FieldValue, TMRecord } from "../src/core/types";
import { allPaths } from "./helpers_paths";

const SRC = resolve(__dirname, "../src");
const files: string[] = [];
const walk = (d: string) => { for (const n of readdirSync(d)) { const f = join(d, n); statSync(f).isDirectory() ? walk(f) : /\.ts$/.test(n) && files.push(f); } };
walk(SRC);
const uiText = files.filter((f) => /\/ui\//.test(f) || /\/core\//.test(f)).map((f) => readFileSync(f, "utf8")).join("\n");

const hasInput = (id: string, step: number) => step > 0 || uiText.includes(`"${id}"`);

// Marker per field. Only text / number / money / list fields can carry one.
const idx = new Map(FIELDS.map((f, i) => [f.id, i]));
const textMark = (id: string) => `ZQ${idx.get(id)}X`;
const numMark = (id: string) => 7000000 + idx.get(id)!;
const checkable = (type: string) => ["text", "number", "money", "list"].includes(type);

function valueFor(f: (typeof FIELDS)[number]): FieldValue {
  const v = (value: unknown): FieldValue => ({ state: "value", value, label: "DEMO" });
  switch (f.type) {
    case "text": return v(textMark(f.id));
    case "list": return v([textMark(f.id)]);
    case "number": case "money": return v(numMark(f.id));
    case "scale": return v(3);
    case "bool": return v(true);
    case "date": return v("2026-11-01");
    case "multichoice": return v([f.options?.[0]?.code ?? "x"]);
    default: return v(f.options?.[0]?.code ?? "x");
  }
}

let shown = new Set<string>();
beforeAll(async () => {
  await preloadLazy();
  localStorage.clear(); store.demo.clear(); store.real.clear();
  grantConsent(consentKv, "2026-11-02T00:00:00.000Z"); localStorage.setItem("tm:ui:dataMode", "demo"); localStorage.setItem("tm:ui:lang", "en");
  const byEntity = new Map<string, TMRecord>();
  for (const f of FIELDS) {
    let r = byEntity.get(f.entity);
    if (!r) { r = { id: `zq-${f.entity}`, entity: f.entity, ns: "demo", ownerId: "demo-user", schemaVersion: 1, createdAt: "2026-11-01T00:00:00.000Z", values: {} }; byEntity.set(f.entity, r); }
    r.values[f.id] = valueFor(f);
  }
  for (const r of byEntity.values()) store.demo.put(r);
  const paths = allPaths(["/journey/goal/zq-goal", "/focus/zq-task"]);
  let text = "";
  for (const p of paths) {
    document.body.innerHTML = '<div id="app"></div>'; location.hash = "#" + p; render();
    text += " " + (document.body.textContent ?? "");
  }
  const flat = text.replace(/[,\s]/g, "");
  for (const f of FIELDS) {
    if (!checkable(f.type)) continue;
    if (f.type === "number" || f.type === "money") { if (flat.includes(String(numMark(f.id)))) shown.add(f.id); }
    else if (text.includes(textMark(f.id))) shown.add(f.id);
  }
}, 120000);

// Which module owns a field. Normally the module of its entity; the health note belongs to Health and family (M14).
const OWNER: Record<string, string> = { "profile.health_note": "M14" };
const ownerOf = (id: string) => OWNER[id] ?? entityById(FIELDS.find((f) => f.id === id)!.entity)!.module;

// A field is "read or written by code" when its id appears as a literal in src/ui or src/core (the field list, the demo seed and the labels do not count).
const usedByCode = (id: string) => uiText.includes(`"${id}"`);

// Known gaps (audit 2 Nov 2026). These lists only shrink: a field that is fixed but still listed fails the test, and a module that
// claims "complete" may own none of them.
// DEAD = stored by nobody or read by nobody: no code names the field and no screen shows it.
const DEAD: string[] = ["constraint.hours_per_week", "giving.amount", "hajj_plan.note", "learning_item.title", "prayer_log.note", "profile.birth_year", "profile.display_name", "profile.health_note",
  "profile.timezone", "quran_activity.note", "right_duty.note", "zakat_snapshot.note"];
// NO_INPUT = no progressive-intake step and no form names the field.
const NO_INPUT: string[] = ["giving.amount", "hajj_plan.note", "learning_item.title", "prayer_log.note", "profile.health_note", "quran_activity.note", "right_duty.note", "zakat_snapshot.note"];

const dead = () => FIELDS.filter((f) => checkable(f.type) && !shown.has(f.id) && !usedByCode(f.id)).map((f) => f.id);
const noInput = () => FIELDS.filter((f) => !hasInput(f.id, f.step)).map((f) => f.id);
const sorted = (a: string[]) => [...a].sort();

describe("field reach (stored but never shown, or never typable)", () => {
  it("the sentinel crawl really saw screens (a field that is shown is found)", () => {
    expect(shown.has("venture.name")).toBe(true);
    expect(shown.has("risk.text")).toBe(true);
    expect(shown.size).toBeGreaterThan(25);
  });
  it("no new field is dead: every text/number field is shown by a screen or read by code (except the known list)", () => {
    console.log("DEAD", JSON.stringify(sorted(dead())));
    expect(sorted(dead())).toEqual(sorted(DEAD));
  });
  it("no new field is untypable: every field has an intake step or a form (except the known list)", () => {
    console.log("NO_INPUT", JSON.stringify(sorted(noInput())));
    expect(sorted(noInput())).toEqual(sorted(NO_INPUT));
  });
  it("a module that claims 'complete' owns no dead and no untypable field", () => {
    const complete = new Set(MODULES.filter((m) => buildLabel(m) === "complete").map((m) => m.id));
    for (const id of [...DEAD, ...NO_INPUT]) expect(complete.has(ownerOf(id)), `${id} belongs to ${ownerOf(id)}, which says complete`).toBe(false);
  });
  it("a module with a dead field has its Output box missing, one with an untypable field has its Input box missing", () => {
    const by = (id: string) => MODULES.find((m) => m.id === ownerOf(id))!;
    for (const id of DEAD) expect(by(id).build.output, `${id} -> ${by(id).id}`).toBe("missing");
    for (const id of NO_INPUT) expect(by(id).build.input, `${id} -> ${by(id).id}`).toBe("missing");
  });
});
