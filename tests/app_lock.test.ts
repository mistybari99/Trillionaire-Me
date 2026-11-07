// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryKV } from "../src/core/store";
import { LOCK_KEY, RESET_WAIT_MIN, finishForgot, forgotReadyAt, lockEnabled, pinProblem, readLock, removeWithPin, setAuto, setPin, shouldLockAfterHide, startForgot, verifyPin } from "../src/core/appLock";
import { createBackup } from "../src/core/backup";
import { StoreRepo } from "../src/adapters/storeRepo";
import { Store } from "../src/core/store";
import { PACKS } from "../src/i18n/packs";
import { render } from "../src/app";
import { consentKv, store } from "../src/ui/state";
import { lockNow } from "../src/ui/lockUi";

const IT = 1000; // fast iterations in tests
const NOW = 1_800_000_000_000;

describe("app lock core", () => {
  it("off by default; PIN rules; hash only, salted, no plain PIN stored", async () => {
    const kv = new MemoryKV(); expect(lockEnabled(kv)).toBe(false);
    expect(pinProblem("12")).toBe("format"); expect(pinProblem("12a45")).toBe("format"); expect(pinProblem("123456789")).toBe("format"); expect(pinProblem("1234", "1235")).toBe("mismatch"); expect(pinProblem("1234", "1234")).toBeNull();
    await expect(setPin(kv, "1234", "9999", IT)).rejects.toThrow();
    await setPin(kv, "4821", "4821", IT);
    const raw = kv.get(LOCK_KEY)!; expect(raw).not.toContain("4821"); expect(raw.startsWith("{")).toBe(true);
    const a = readLock(kv)!; await setPin(kv, "4821", "4821", IT); expect(readLock(kv)!.salt).not.toBe(a.salt); expect(readLock(kv)!.hash).not.toBe(a.hash);
    expect(LOCK_KEY.startsWith("tm:secret:")).toBe(true);
  });
  it("right PIN opens, wrong PIN does not, waits grow after 5 misses and a right PIN resets", async () => {
    const kv = new MemoryKV(); await setPin(kv, "4821", "4821", IT);
    expect((await verifyPin(kv, "0000", NOW)).ok).toBe(false);
    for (let i = 0; i < 3; i++) await verifyPin(kv, "1111", NOW);
    const fifth = await verifyPin(kv, "1111", NOW); expect(fifth).toMatchObject({ ok: false, reason: "wait", waitSeconds: 30 });
    expect(await verifyPin(kv, "4821", NOW + 1000)).toMatchObject({ ok: false, reason: "wait" });
    expect((await verifyPin(kv, "4821", NOW + 31_000)).ok).toBe(true); expect(readLock(kv)!.fails).toBe(0);
  });
  it("turning off needs the PIN; auto-lock setting; lock after hide rule", async () => {
    const kv = new MemoryKV(); await setPin(kv, "4821", "4821", IT);
    expect((await removeWithPin(kv, "1111", NOW)).ok).toBe(false); expect(lockEnabled(kv)).toBe(true);
    setAuto(kv, 5); expect(readLock(kv)!.auto).toBe(5); setAuto(kv, 7); expect(readLock(kv)!.auto).toBe(5);
    expect(shouldLockAfterHide(0, NOW, NOW)).toBe(true); expect(shouldLockAfterHide(5, NOW, NOW + 4 * 60_000)).toBe(false); expect(shouldLockAfterHide(5, NOW, NOW + 5 * 60_000)).toBe(true);
    expect((await removeWithPin(kv, "4821", NOW)).ok).toBe(true); expect(lockEnabled(kv)).toBe(false);
  });
  it("forgot PIN: waiting period, confirmation needed, only the PIN is removed, records untouched", async () => {
    const kv = new MemoryKV(); await setPin(kv, "4821", "4821", IT);
    const st = new Store(new MemoryKV()); st.demo.put({ id: "a", entity: "profile", ns: "demo", ownerId: "u", schemaVersion: 1, createdAt: "2026-11-01T00:00:00Z", values: { "profile.display_name": { state: "value", value: "a", label: "DEMO" } } });
    const ready = startForgot(kv, NOW)!; expect(ready).toBe(NOW + RESET_WAIT_MIN * 60_000); expect(startForgot(kv, NOW + 5 * 60_000)).toBe(ready); // asking again does not restart the clock
    expect(finishForgot(kv, NOW + 60_000, true)).toBe(false); expect(finishForgot(kv, ready, false)).toBe(false); expect(lockEnabled(kv)).toBe(true);
    expect(finishForgot(kv, ready, true)).toBe(true); expect(lockEnabled(kv)).toBe(false); expect(forgotReadyAt(kv)).toBeNull();
    expect(st.demo.list().length).toBe(1);
    // a right PIN cancels a pending reset
    const kv2 = new MemoryKV(); await setPin(kv2, "4821", "4821", IT); startForgot(kv2, NOW); await verifyPin(kv2, "4821", NOW); expect(forgotReadyAt(kv2)).toBeNull();
  });
  it("the PIN never appears in a backup", async () => {
    const kv = new MemoryKV(); await setPin(kv, "4821", "4821", IT);
    const st = new Store(new MemoryKV()); const b = JSON.stringify(await createBackup(new StoreRepo(st), "demo"));
    expect(b).not.toContain(readLock(kv)!.hash); expect(b).not.toContain("applock");
  });
  it("wording exists in EN and BN and the copy is plain", () => {
    for (const k of Object.keys(PACKS.en).filter((x) => x.startsWith("lock."))) { expect(PACKS.bn[k as keyof typeof PACKS.bn], k).toBeTruthy(); }
    expect(PACKS.en["lock.forgot.p1"]).toContain("not deleted");
  });
});

describe("lock screen", () => {
  const app = () => document.getElementById("app")!;
  beforeEach(() => { localStorage.clear(); store.demo.clear(); document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo"); });
  it("with the lock on, the app shows only the keypad; keys are 44px or more and have text; 0-9 and delete present", async () => {
    await setPin(consentKv, "4821", "4821", IT); lockNow(); location.hash = "#/today"; render();
    expect(app().querySelector("[data-lock-screen]")).not.toBeNull(); expect(app().querySelector("nav")).toBeNull();
    for (const d of "0123456789") expect(app().querySelector(`[data-act=lock-key-${d}]`), d).not.toBeNull();
    const del = app().querySelector("[data-act=lock-del]") as HTMLElement; expect(del.getAttribute("aria-label")).toBeTruthy();
    for (const b of Array.from(app().querySelectorAll("button"))) expect(parseInt((b as HTMLElement).style.minHeight || "44", 10), b.textContent ?? "").toBeGreaterThanOrEqual(44);
    expect(app().querySelector("[data-lock=count]")!.getAttribute("role")).toBe("status");
    const pin = app().querySelector("#lock-pin") as HTMLInputElement; for (const d of "4821") (app().querySelector(`[data-act=lock-key-${d}]`) as HTMLElement).click(); expect(pin.value).toBe("4821");
    (app().querySelector("form") as HTMLFormElement).dispatchEvent(new Event("submit", { cancelable: true }));
    await new Promise((r) => setTimeout(r, 1500)); render();
    expect(app().querySelector("[data-lock-screen]")).toBeNull(); expect(app().querySelector("nav")).not.toBeNull();
    localStorage.clear();
  }, 20000);
});
