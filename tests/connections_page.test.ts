// Settings redesign PR 3g: Connections page: computed "nothing leaves this phone" line and a fixed control order.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { preloadLazy } from "../src/ui/lazy";
import { consentKv } from "../src/ui/state";
import { grantApproval, setEnabled, withdrawApproval } from "../src/core/connections";
import { FACILITY_IDS } from "../src/core/ports";

const app = () => document.getElementById("app")!;
const q = <T extends Element>(s: string) => app().querySelector(s) as T;
const go = (hash: string) => { location.hash = hash; render(); };
beforeEach(async () => {
  await preloadLazy(); localStorage.clear(); document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo");
  for (const id of FACILITY_IDS) withdrawApproval(consentKv, id);
});
describe("Connections page", () => {
  it("lives at /settings/connections and opens with a computed line", () => {
    go("#/settings/connections"); expect(q("[data-conn-summary]").textContent).toBe("0 of 4 on. Nothing leaves this phone."); expect(q("nav a[aria-current=page]").getAttribute("href")).toBe("#/settings");
    grantApproval(consentKv, "webSearch", "2026-10-26T10:00:00.000Z"); setEnabled(consentKv, "webSearch", true); go("#/settings/connections");
    expect(q("[data-conn-summary]").textContent).toBe("1 of 4 on."); // no longer claims nothing leaves
  });
  it("each card keeps one order: Approve, Turn on, Key, Withdraw, with equal weight", () => {
    go("#/settings/connections"); const card = q("[data-conn=webSearch]");
    const order = [...card.querySelectorAll("[data-conn-approve],[data-conn-enable],[data-conn-keybox],[data-conn-withdraw]")].map((e) => Object.keys((e as HTMLElement).dataset)[0]);
    expect(order).toEqual(["connApprove", "connEnable", "connKeybox"]);
    grantApproval(consentKv, "webSearch", "2026-10-26T10:00:00.000Z"); go("#/settings/connections");
    expect([...q("[data-conn=webSearch]").querySelectorAll("[data-conn-approve],[data-conn-enable],[data-conn-keybox],[data-conn-withdraw]")].map((e) => Object.keys((e as HTMLElement).dataset)[0])).toEqual(["connEnable", "connKeybox", "connWithdraw"]);
    for (const b of card.querySelectorAll("button[data-conn-approve], button[data-conn-enable]")) expect(b.className).toBe("btn ghost");
  });
  it("the Settings home card agrees with the page", () => { go("#/settings"); expect(q("[data-summary=connections]").textContent).toBe("0 of 4 on. Nothing leaves this phone."); });
});
