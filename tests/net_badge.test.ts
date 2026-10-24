// Online/offline events must not re-render the screen (a re-render closes the Suggest panel and drops typed text).
import { afterEach, describe, expect, it } from "vitest";
import { updateNetBadge } from "../src/ui/net";

describe("connection badge", () => {
  afterEach(() => { Object.defineProperty(navigator, "onLine", { value: true, configurable: true }); document.body.innerHTML = ""; localStorage.clear(); });
  it("switches the badge text and keeps the same DOM (typed text and open panels survive)", () => {
    localStorage.setItem("tm:ui:lang", "en");
    document.body.innerHTML = '<span class="net" data-net="online">Online</span><details open><input id="q" value="typed"></details>';
    const input = document.getElementById("q") as HTMLInputElement;
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    updateNetBadge();
    const badge = document.querySelector("[data-net]")!;
    expect(badge.getAttribute("data-net")).toBe("offline");
    expect(badge.textContent).toBe("Offline");
    expect(document.getElementById("q")).toBe(input);
    expect(input.value).toBe("typed");
    expect(document.querySelector("details")!.open).toBe(true);
  });
  it("back online restores the online label", () => {
    localStorage.setItem("tm:ui:lang", "bn");
    document.body.innerHTML = '<span data-net="offline">x</span>';
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
    updateNetBadge();
    expect(document.querySelector("[data-net]")!.getAttribute("data-net")).toBe("online");
    expect(document.querySelector("[data-net]")!.textContent).toBe("Online");  // common English word, kept in Bangla
  });
  it("does nothing when the badge is not on screen", () => {
    expect(() => updateNetBadge()).not.toThrow();
  });
});
