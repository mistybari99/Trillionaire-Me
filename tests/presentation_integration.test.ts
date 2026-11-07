import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { helpTrigger } from "../src/ui/helpUi";
import { createBottomNavigation } from "../src/ui/quickNavigationUi";
import { closeTransientOverlay } from "../src/ui/overlayCoordinator";
import { ownerProfileLink, ownerProfileScreen } from "../src/ui/ownerProfileUi";
import { screenHelpTopic, enhanceScreenHelp } from "../src/ui/screenHelp";
import { resetPresentationPreferences } from "../src/ui/presentationPreferences";
import { consentKv, store } from "../src/ui/state";
import { revokeConsent } from "../src/core/consent";
beforeEach(() => { closeTransientOverlay("context"); localStorage.clear(); resetPresentationPreferences(); localStorage.setItem("tm:ui:dataMode", "demo"); localStorage.setItem("tm:ui:lang", "en"); document.body.replaceChildren(); });
afterEach(() => { closeTransientOverlay("context"); document.body.replaceChildren(); });
const combinations = ["inline", "sheet"].flatMap(placement => ["diagram", "illustrated"].flatMap(visuals => ["guide", "guide-and-mine"].flatMap(content => ["navigate", "menu"].map(nav => ({placement,visuals,content,nav})))));
describe("presentation across help and navigation", () => {
  it.each(combinations)("$placement / $visuals / $content / $nav share one overlay and preserve drafts", ({placement,visuals,content,nav}) => {
    for (const [key,value] of Object.entries({helpPlacement:placement, helpVisuals:visuals,helpContent:content,tabNavigation:nav})) localStorage.setItem(`tm:ui:${key}`,value);
    const app=document.createElement("div"); app.id="app";
    const draft=document.createElement("textarea"); draft.value="unfinished";
    app.append(draft,helpTrigger("goals","en"),createBottomNavigation("today","en")); document.body.append(app);
    app.querySelector<HTMLButtonElement>(".help-trigger")!.click();
    expect(document.querySelectorAll(".context-help")).toHaveLength(1);
    expect(document.querySelectorAll(".help-illustration").length).toBe(visuals === "illustrated" ? 1 : 0);
    expect(document.querySelectorAll('[role="tab"]').length).toBe(content === "guide-and-mine" ? 2 : 0);
    if(nav === "menu") { // Modal help intentionally blocks background input; close it before opening navigation.
      document.querySelector<HTMLButtonElement>(".help-close")!.click();
      app.querySelector<HTMLButtonElement>('[data-tab-menu="journey"]')!.click();
      expect(document.querySelectorAll(".quick-panel")).toHaveLength(1);
      expect(document.querySelector(".context-help")).toBeNull();
    } else expect(app.querySelectorAll(".bottom-tabs a")).toHaveLength(5);
    expect(draft.isConnected).toBe(true); expect(draft.value).toBe("unfinished");
  });
  it("keeps instructional units inline and does not remove arbitrary intro prose", () => {
    const main=document.createElement("main"); main.innerHTML='<h1>Money</h1><p class="sub">BDT; Unknown is not zero.</p>';
    enhanceScreenHelp(main,"/diary/money","en");
    expect(main.querySelector("p.sub")?.textContent).toContain("Unknown"); expect(main.querySelector(".help-trigger")).not.toBeNull();
    expect(screenHelpTopic("/settings/backup/restore")).toBe("backup"); expect(screenHelpTopic("/deen/prayers")).toBe("deen");
  });
  it("offers an accessible owner entry and existing settings without leaking demo data into unconsented real mode", () => {
    store.demo.clear(); store.real.clear(); revokeConsent(consentKv);
    localStorage.setItem("tm:ui:dataMode","real");
    const link=ownerProfileLink("en"), page=ownerProfileScreen();
    expect(link.getAttribute("aria-label")).toBe("Owner profile"); expect(link.getAttribute("href")).toBe("#/profile");
    expect(page.querySelector('a[href="#/diary/intake/1"]')).not.toBeNull();
    for(const cat of ["look","privacy","backup","data","prayer","about"]) expect(page.querySelector(`a[href="#/settings/${cat}"]`)).not.toBeNull();
    expect(page.querySelector('[data-prof="name"] [data-unknown]')).not.toBeNull();
  });
});
