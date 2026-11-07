import { describe, expect, it } from "vitest";
import { readStorageStatus, requestPersist, sizeText } from "../src/core/storageStatus";
import { PACKS } from "../src/i18n/packs";

describe("storage status", () => {
  it("unsupported browser gives Unknown (null), never 0 or false", async () => {
    expect(await readStorageStatus(undefined)).toEqual({ persisted: null, usage: null, quota: null });
    expect(await requestPersist({})).toBeNull();
    expect(sizeText(null)).toBeNull();
  });
  it("reads persisted and estimate; errors become Unknown", async () => {
    const ok = await readStorageStatus({ persisted: async () => true, estimate: async () => ({ usage: 2048, quota: 5 * 1024 ** 3 }) });
    expect(ok).toEqual({ persisted: true, usage: 2048, quota: 5 * 1024 ** 3 });
    const bad = await readStorageStatus({ persisted: async () => { throw new Error("x"); }, estimate: async () => ({ usage: -1 }) });
    expect(bad).toEqual({ persisted: null, usage: null, quota: null });
    expect(await readStorageStatus({ persisted: async () => false })).toMatchObject({ persisted: false, usage: null });
  });
  it("asks the browser to keep data, once, and reports the answer", async () => {
    let calls = 0;
    expect(await requestPersist({ persist: async () => { calls++; return true; } })).toBe(true);
    expect(await requestPersist({ persist: async () => false })).toBe(false);
    expect(await requestPersist({ persist: async () => { throw new Error("x"); } })).toBeNull();
    expect(calls).toBe(1);
  });
  it("size text uses Latin digits", () => { expect(sizeText(1536)).toBe("1.5 KB"); expect(sizeText(10)).toBe("10 B"); expect(sizeText(3 * 1024 ** 2)).toBe("3.0 MB"); });
  it("wording exists in EN and BN with an Unknown line", () => { for (const k of ["store.persist.unknown", "store.usage.unknown", "store.persist.yes", "store.persist.no"] as const) { expect(PACKS.en[k]).toBeTruthy(); expect(PACKS.bn[k]).toBeTruthy(); } expect(PACKS.en["store.persist.unknown"]).toMatch(/^Unknown/); });
});
