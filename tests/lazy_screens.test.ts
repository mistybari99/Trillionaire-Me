// Bundle split: heavy screens are lazy chunks. Before a chunk arrives the page says "Loading" (calm, no error colour);
// after it arrives the real screen is drawn. Every lazy chunk is also listed for the offline cache (see tests/precache.test.ts).
import { describe, expect, it } from "vitest";
import { lazyModule, viaLazy } from "../src/ui/lazy";
import { CONN, DECIDE, LEGS, PLAN } from "../src/ui/lazyScreens";
import { precacheList } from "../tools/precache";

describe("lazy screens", () => {
  it("shows a calm loading page first, then rebuilds when the chunk is there", async () => {
    document.body.innerHTML = '<div id="app"></div>';
    let fired = 0; window.addEventListener("hashchange", () => { fired++; });
    const l = lazyModule("t", async () => ({ screen: () => { const m = document.createElement("main"); m.textContent = "REAL"; return m; } }));
    const first = viaLazy(l, (m) => m.screen());
    expect(first.getAttribute("data-lazy-loading")).toBe("t");
    expect(first.querySelector(".err")).toBeNull();
    await l.load(); await Promise.resolve();
    expect(fired).toBeGreaterThan(0);
    expect(viaLazy(l, (m) => m.screen()).textContent).toBe("REAL");
  });
  it("a failed chunk shows plain text and can be retried", async () => {
    let n = 0;
    const l = lazyModule("f", async () => { if (n++ === 0) throw new Error("offline"); return { ok: true }; });
    const box = viaLazy(l, () => document.createElement("main"));
    await new Promise((r) => setTimeout(r, 0));
    expect(box.textContent).toMatch(/could not load|লোড হয়নি/);
    await l.load(); expect(l.get()).toEqual({ ok: true });
  });
  it("the registered screens are loaded in tests (setup) and expose their screens", () => {
    expect(typeof PLAN.get()!.riskScreen).toBe("function");
    expect(typeof CONN.get()!.connectionsScreen).toBe("function");
    expect(typeof DECIDE.get()!.decisionScreen).toBe("function");
    expect(typeof LEGS.get()!.legsScreen).toBe("function");
  });
  it("offline cache list includes every built chunk, not only the entry file", () => {
    const list = precacheList(["index.html", "assets/index-a.js", "assets/planScreens-b.js", "assets/dexie-c.js", "sw.js"]);
    expect(list).toContain("./assets/planScreens-b.js"); expect(list).toContain("./assets/dexie-c.js"); expect(list).not.toContain("./sw.js");
  });
});

import { HALAL, } from "../src/ui/lazyScreens";
import { FLAG_GROUPS, HALAL_FLAGS } from "../src/library/halalFlags";
import { render } from "../src/app";
import { PACKS } from "../src/i18n/packs";

describe("halal-check flags (draft)", () => {
  it("is a lazy chunk and the page says: not a fatwa, ask a qualified person, draft", () => {
    expect(typeof HALAL.get()!.halalFlagsScreen).toBe("function");
    for (const lang of ["en", "bn", "mix"] as const) {
      document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", lang); localStorage.setItem("tm:ui:dataMode", "demo"); location.hash = "#/more/halal-flags"; render();
      expect(document.querySelector("[data-halal-banner]")!.textContent).toBe(`${PACKS[lang]["halal.banner"]}${PACKS[lang]["halal.draft"]}`);
      expect(document.querySelectorAll("[data-flag]").length).toBe(HALAL_FLAGS.length);
    }
    expect(PACKS.en["halal.banner"]).toMatch(/not a fatwa.*qualified person/i);
  });
  it("every group has at least one question, ids are unique, all questions are bilingual and end as questions", () => {
    for (const g of FLAG_GROUPS) expect(HALAL_FLAGS.some((x) => x.group === g), g).toBe(true);
    expect(new Set(HALAL_FLAGS.map((x) => x.id)).size).toBe(HALAL_FLAGS.length);
    for (const x of HALAL_FLAGS) { expect(x.q.en.endsWith("?"), x.id).toBe(true); expect(x.q.bn.endsWith("?"), x.id).toBe(true); expect(/[ঀ-৿]/.test(x.q.bn)).toBe(true); }
  });
  it("gives no verdict: no ruling words and no scripture names, no rates or product names", () => {
    const all = JSON.stringify(HALAL_FLAGS);
    expect(/\b(halal is|haram is|is halal|is haram|permitted|forbidden|allowed|prohibited)\b|হারাম|হালাল (নয়|বলে)/i.test(all)).toBe(false);
    expect(/কুরআন|হাদিস|সূরা|আয়াত|আল্লাহ|quran|hadith|surah|ayah|allah|%|৳|\bbdt\b/i.test(all)).toBe(false);
  });
});
