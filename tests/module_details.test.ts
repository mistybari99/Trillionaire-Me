import "fake-indexeddb/auto";
import { beforeEach, expect, it } from "vitest";
import { journey, diary, deen, status } from "../src/ui/screens";
import { store } from "../src/ui/state";
import { MODULES } from "../src/modules/capability";
import { PACKS } from "../src/i18n/packs";
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); store.demo.clear(); store.real.clear(); });
it.each(["demo", "real"])("technical cards start closed on everyday screens in %s mode", mode => {
  localStorage.setItem("tm:ui:dataMode", mode);
  for (const lang of ["en", "bn", "mix"] as const) {
    localStorage.setItem("tm:ui:lang", lang);
    for (const [tab, build] of [["journey", journey], ["diary", diary], ["deen", deen]] as const) {
      const root = build(); const details = root.querySelector<HTMLDetailsElement>(`[data-module-details=${tab}]`)!;
      expect(details).not.toBeNull(); expect(details.open).toBe(false);
      expect(details.firstElementChild?.tagName).toBe("SUMMARY"); expect(details.firstElementChild?.textContent).toBe(PACKS[lang]["cap.details"]);
      const cards = root.querySelectorAll("[data-module]"); expect(cards.length).toBe(MODULES.filter(m => m.tab === tab).length);
      for (const card of cards) { expect(details.contains(card)).toBe(true); expect(card.querySelectorAll("[data-box]")).toHaveLength(6); expect(card.querySelector("[data-cap-data]")).not.toBeNull(); }
      expect(details.querySelector('a[href="#/diary/plan"],a[href="#/deen/plans"]')).toBeNull();
    }
  }
});
it("dedicated status screen keeps all 25 complete diagnostic cards directly available", () => {
  localStorage.setItem("tm:ui:lang", "en"); const root = status();
  expect(root.querySelector("[data-module-details]")).toBeNull();
  expect(root.querySelectorAll("[data-module]")).toHaveLength(25);
  for (const card of root.querySelectorAll("[data-module]")) expect(card.querySelector("[data-build]")).not.toBeNull();
});
