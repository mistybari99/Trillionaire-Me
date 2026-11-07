import "fake-indexeddb/auto";
import { beforeEach, expect, it } from "vitest";
import { journey, diary, deen, status } from "../src/ui/screens";
import { store } from "../src/ui/state";
import { PACKS } from "../src/i18n/packs";
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); store.demo.clear(); store.real.clear(); });
it.each(["demo", "real"])("everyday screens link to diagnostics without embedding engineering cards in %s mode", mode => {
  localStorage.setItem("tm:ui:dataMode", mode);
  for (const lang of ["en", "bn", "mix"] as const) {
    localStorage.setItem("tm:ui:lang", lang);
    for (const build of [journey, diary, deen]) {
      const root = build();
      expect(root.querySelector("[data-module-details], [data-module], [data-box], [data-cap-data], [data-build]")).toBeNull();
      const links = root.querySelectorAll<HTMLAnchorElement>('a[href="#/more/status"]');
      expect(links).toHaveLength(1);
      expect(links[0]!.textContent).toBe(PACKS[lang]["cap.details"]);
    }
  }
});
it.each(["demo", "real"])("dedicated status screen keeps all 25 complete diagnostic cards available in %s mode", mode => {
  localStorage.setItem("tm:ui:dataMode", mode);
  for (const lang of ["en", "bn", "mix"] as const) {
    localStorage.setItem("tm:ui:lang", lang); const root = status();
    expect(root.querySelector("[data-module-details]")).toBeNull();
    expect(root.querySelectorAll("[data-module]")).toHaveLength(25);
    for (const card of root.querySelectorAll("[data-module]")) {
      expect(card.querySelector("[data-build]")).not.toBeNull();
      expect(card.querySelectorAll("[data-box]")).toHaveLength(6);
      expect(card.querySelector("[data-cap-data]")).not.toBeNull();
    }
  }
});
