// Build step 4: encrypted backup. Pure crypto + UI flow.
import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { createBackup, checksum } from "../src/core/backup";
import { decryptBackup, encryptBackup, isEncryptedBackup, passphraseProblem, type BackupBundle } from "../src/core/cryptoBackup";
import { Store, MemoryKV } from "../src/core/store";
import { StoreRepo } from "../src/adapters/storeRepo";
import type { FieldValue, Namespace, TMRecord } from "../src/core/types";

const IT = 1000; // fast for tests; the real default is 600000
const mk = (ns: Namespace, id: string): TMRecord => {
  const v: FieldValue = { state: "value", value: "x " + id, label: ns === "demo" ? "DEMO" : "FACT" };
  return { id, entity: "task", ns, ownerId: ns === "demo" ? "demo-user" : "owner", schemaVersion: 1, createdAt: "2026-10-25T00:00:00.000Z", values: { "task.title": v } };
};
async function bundle(): Promise<BackupBundle> {
  const kv = new MemoryKV(); const ck = new MemoryKV();
  const { grantConsent } = await import("../src/core/consent"); grantConsent(ck, "2026-10-25T00:00:00.000Z");
  const st = new Store(kv, { realEnabled: true, consentKv: ck });
  st.demo.put(mk("demo", "d1")); st.real.put(mk("real", "r1")); st.real.put(mk("real", "r2"));
  const repo = new StoreRepo(st);
  return { demo: await createBackup(repo, "demo"), real: await createBackup(repo, "real") };
}

describe("encrypted backup (pure)", () => {
  it("round trip returns the same demo and real parts", async () => {
    const b = await bundle(); const e = await encryptBackup(b, "correct horse", IT);
    expect(isEncryptedBackup(JSON.stringify(e))).toBe(true);
    const out = await decryptBackup(JSON.stringify(e), "correct horse");
    expect(out.demo.ns).toBe("demo"); expect(out.real!.ns).toBe("real");
    expect(out.demo.records.map((r) => r.id)).toEqual(["d1"]); expect(out.real!.records.map((r) => r.id)).toEqual(["r1", "r2"]);
  });
  it("file holds no readable data or passphrase", async () => {
    const e = JSON.stringify(await encryptBackup(await bundle(), "correct horse", IT));
    expect(e).not.toContain("x r1"); expect(e).not.toContain("correct horse"); expect(e).not.toContain("FACT");
  });
  it("wrong passphrase fails with a plain error", async () => {
    const e = JSON.stringify(await encryptBackup(await bundle(), "correct horse", IT));
    await expect(decryptBackup(e, "wrong horse!!")).rejects.toThrow(/Wrong passphrase/);
  });
  it("tampered ciphertext, iv, salt or header fails", async () => {
    const e = await encryptBackup(await bundle(), "correct horse", IT);
    const flip = (s: string) => (s[0] === "A" ? "B" : "A") + s.slice(1);
    for (const bad of [{ ...e, data: flip(e.data) }, { ...e, iv: flip(e.iv) }, { ...e, salt: flip(e.salt) }, { ...e, iterations: e.iterations + 1 }])
      await expect(decryptBackup(JSON.stringify(bad), "correct horse")).rejects.toThrow();
    await expect(decryptBackup("{not json", "correct horse")).rejects.toThrow(/damaged/);
    await expect(decryptBackup(JSON.stringify({ ...e, kind: "x" }), "correct horse")).rejects.toThrow(/damaged/);
  });
  it("salt and iv differ per backup", async () => {
    const b = await bundle(); const a = await encryptBackup(b, "correct horse", IT); const c = await encryptBackup(b, "correct horse", IT);
    expect(a.salt).not.toBe(c.salt); expect(a.iv).not.toBe(c.iv); expect(a.data).not.toBe(c.data);
  });
  it("empty and short passphrases are refused", async () => {
    expect(passphraseProblem("")).toBe("empty"); expect(passphraseProblem("   ")).toBe("empty"); expect(passphraseProblem("short")).toBe("short"); expect(passphraseProblem("long enough")).toBeNull();
    await expect(encryptBackup(await bundle(), "", IT)).rejects.toThrow(); await expect(encryptBackup(await bundle(), "abc", IT)).rejects.toThrow();
    await expect(decryptBackup("{}", "")).rejects.toThrow();
  });
  it("a demo part can never be labelled real (forged bundle refused)", async () => {
    const b = await bundle(); const forged = { demo: b.demo, real: { ...b.demo } } as unknown as BackupBundle;
    const e = JSON.stringify(await encryptBackup(forged, "correct horse", IT));
    await expect(decryptBackup(e, "correct horse")).rejects.toThrow(/not valid/);
    expect(checksum("a")).toHaveLength(8);
  });
});
