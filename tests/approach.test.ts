import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { consentKv, store } from "../src/ui/state";
import { grantConsent } from "../src/core/consent";
import { approachFrom } from "../src/core/assessment";
import { PACKS } from "../src/i18n/packs";
import type { FieldValue, TMRecord } from "../src/core/types";

const v = (x: unknown): FieldValue => ({ state: "value", value: x, label: "DEMO" }) as FieldValue;
const $ = (s: string) => document.querySelector(s);
const go = (h: string) => { location.hash = h; render(); };
beforeEach(() => { localStorage.clear(); store.demo.clear(); store.real.clear(); document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo"); grantConsent(consentKv, "2026-11-02T00:00:00.000Z"); });
describe("M02 way of working", () => {
  it("skipped is Unknown; answers are saved and shown back on the card and path line", () => {
    expect(approachFrom([])).toEqual({ "approach.experience": null, "approach.risk_preference": null, "approach.learning_style": null });
    store.demo.put({ id: "s1", entity: "skill", ns: "demo", ownerId: "u", schemaVersion: 1, createdAt: "2026-11-02T00:00:00Z", values: { "skill.name": v("Excel bookkeeping") } } as TMRecord);
    go("#/diary/plan"); expect($('[data-approach="approach.risk_preference"] [data-unknown]')).not.toBeNull(); expect($("[data-approach-line]")).toBeNull();
    (document.getElementById("ap-2") as HTMLSelectElement).value = "doing"; $('form[data-form="approach"]')!.dispatchEvent(new Event("submit", { cancelable: true })); render();
    expect(approachFrom(store.demo.list())["approach.learning_style"]).toBe("doing"); expect($('[data-approach="approach.learning_style"]')!.textContent).toMatch(/By doing/);
    expect($("[data-approach-line]")!.textContent).toMatch(/By doing/); expect($("[data-approach-line]")!.textContent).not.toMatch(/risk/i);
    (document.getElementById("ap-2") as HTMLSelectElement).value = ""; $('form[data-form="approach"]')!.dispatchEvent(new Event("submit", { cancelable: true })); render();
    expect(store.demo.list().filter((r) => r.entity === "approach").length).toBe(0);
  });
  it("real mode needs the tick; keys in all languages with labelled selects", () => {
    localStorage.setItem("tm:ui:dataMode", "real"); localStorage.removeItem("tm:consent:real:v1"); go("#/diary/plan");
    (document.getElementById("ap-0") as HTMLSelectElement).value = "some"; $('form[data-form="approach"]')!.dispatchEvent(new Event("submit", { cancelable: true })); expect(store.real.list().length).toBe(0);
    for (const k of Object.keys(PACKS.en).filter((x) => x.startsWith("ap."))) for (const l of ["en", "bn", "mix"] as const) expect((PACKS[l] as Record<string, string>)[k]!.length).toBeGreaterThan(1);
    for (const l of ["bn", "mix"]) { localStorage.setItem("tm:ui:lang", l); go("#/diary/plan"); for (const i of [0, 1, 2]) expect(document.querySelector(`label[for="ap-${i}"]`)).not.toBeNull(); }
  });
});
