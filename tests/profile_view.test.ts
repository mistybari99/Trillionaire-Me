import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { consentKv, store } from "../src/ui/state";
import { grantConsent } from "../src/core/consent";
import { profileView } from "../src/core/profileView";
import { PACKS } from "../src/i18n/packs";
import type { FieldValue, TMRecord } from "../src/core/types";

const v = (x: unknown): FieldValue => ({ state: "value", value: x, label: "DEMO" }) as FieldValue;
describe("profile view (pure)", () => {
  it("age is a subtraction; no or impossible birth year is Unknown, never 0", () => {
    expect(profileView({ "profile.birth_year": v(1990) }, 2026).age).toBe(36);
    for (const b of [undefined, v(1800), v(2100), v("x"), v(1990.5)]) expect(profileView(b ? { "profile.birth_year": b } : {}, 2026)).toMatchObject({ birthYear: null, age: null });
    expect(profileView({}, 2026)).toEqual({ name: null, birthYear: null, age: null, timeZone: null });
    expect(profileView({ "profile.display_name": v("  Rafi "), "profile.timezone": v("Asia/Dhaka") }, 2026)).toMatchObject({ name: "Rafi", timeZone: "Asia/Dhaka" });
  });
});
const $ = (s: string) => document.querySelector(s);
const go = (h: string) => { location.hash = h; render(); };
beforeEach(() => { localStorage.clear(); store.demo.clear(); store.real.clear(); document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo"); grantConsent(consentKv, "2026-11-02T00:00:00.000Z"); });
describe("screens", () => {
  it("diary retains typed profile details while Today keeps its compact workspace header", () => {
    go("#/diary"); expect($('[data-prof="name"] [data-unknown]')).not.toBeNull(); go("#/today"); expect($("[data-greeting]")).toBeNull();
    const r: TMRecord = { id: "intake-profile", entity: "profile", ns: "demo", ownerId: "u", schemaVersion: 1, createdAt: "2026-11-02T00:00:00Z", values: { "profile.display_name": v("Rafi"), "profile.birth_year": v(1990), "profile.timezone": v("Asia/Dhaka") } };
    store.demo.put(r); go("#/today"); expect($("[data-greeting]")).toBeNull(); expect($("[data-workspace-header] h1")).not.toBeNull();
    go("#/diary"); expect($('[data-prof="name"]')!.textContent).toContain("Rafi"); expect($('[data-prof="age"]')!.textContent).toMatch(/about \d+ years/); expect($('[data-prof="tz"]')!.textContent).toMatch(/Asia\/Dhaka/);
  });
  it("keys in all languages", () => { for (const k of Object.keys(PACKS.en).filter((x) => x.startsWith("prof."))) for (const l of ["en", "bn", "mix"] as const) expect((PACKS[l] as Record<string, string>)[k]!.length).toBeGreaterThan(1); });
});
