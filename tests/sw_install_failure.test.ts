// Interrupted required downloads must never retire the complete offline shell.
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { stampServiceWorker } from "../tools/precache";

function worker() {
  const handlers: Record<string, (event: unknown) => void> = {};
  const saved = new Map<string, Set<string>>([["tm-shell-old", new Set(["./", "./old.js"])]]);
  let failing = true;
  const claim = vi.fn();
  const caches = {
    open: async (key: string) => {
      if (!saved.has(key)) saved.set(key, new Set());
      return { add: async (request: { url: string }) => {
        if (failing && request.url === "./new.js") throw new Error("interrupted download");
        saved.get(key)!.add(request.url);
      } };
    },
    keys: async () => [...saved.keys()],
    delete: async (key: string) => saved.delete(key),
  };
  const self = { registration: { scope: "https://offline.test/", active: {} },
    addEventListener: (name: string, handler: (event: unknown) => void) => { handlers[name] = handler; },
    skipWaiting: vi.fn(), clients: { claim } };
  const source = stampServiceWorker(readFileSync("public/sw.js", "utf8"), "next", ["./", "./new.js", "./font.woff2"]);
  new Function("self", "caches", "Request", "URL", source)(self, caches, class { constructor(public url: string) {} }, URL);
  const event = (name: string) => {
    let pending: Promise<unknown> | undefined;
    handlers[name]!({ waitUntil: (p: Promise<unknown>) => { pending = p; } });
    return pending!;
  };
  return { saved, claim, event, allowDownloads: () => { failing = false; } };
}

describe("required offline install failures", () => {
  it("rejects a missing required download while keeping every old asset and avoiding activation", async () => {
    const w = worker();
    await expect(w.event("install")).rejects.toThrow("Required offline files could not be saved");
    expect(w.saved.get("tm-shell-old")).toEqual(new Set(["./", "./old.js"]));
    // Other downloads settle too; the partial new shell is not treated as the active shell.
    expect(w.saved.get("tm-shell-next")).toEqual(new Set(["./", "./font.woff2"]));
    expect(w.claim).not.toHaveBeenCalled();
  });

  it("a later successful retry completes all required assets before activation can remove the old shell", async () => {
    const w = worker();
    await expect(w.event("install")).rejects.toThrow();
    w.allowDownloads();
    await w.event("install");
    expect(w.saved.has("tm-shell-old")).toBe(true);
    expect(w.saved.get("tm-shell-next")).toEqual(new Set(["./", "./new.js", "./font.woff2"]));
    await w.event("activate");
    expect(w.saved.has("tm-shell-old")).toBe(false);
    expect(w.claim).toHaveBeenCalledOnce();
  });
});
