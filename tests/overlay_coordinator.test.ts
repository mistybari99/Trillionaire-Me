import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { closeTransientOverlay, navigateFromOverlay, openTransientOverlay, setOverlayContext } from "../src/ui/overlayCoordinator";

beforeEach(() => { closeTransientOverlay("context"); document.body.replaceChildren(); history.replaceState({}, "", "/"); });
afterEach(() => closeTransientOverlay("context"));
describe("shared overlay ownership", () => {
  it("replaces an inline helper with the tab menu so two surfaces never remain open", () => {
    const help = vi.fn(), menu = vi.fn();
    openTransientOverlay({ id: "help", close: help });
    openTransientOverlay({ id: "menu", close: menu });
    expect(help).toHaveBeenCalledExactlyOnceWith("replace"); expect(menu).not.toHaveBeenCalled();
    setOverlayContext("base"); setOverlayContext("locked");
    expect(menu).toHaveBeenCalledExactlyOnceWith("context");
  });
  it("Back closes a sheet at the same hash and returns focus, without navigating the app", async () => {
    const close = vi.fn(); const trigger = document.createElement("button"); document.body.append(trigger);
    const hash = location.hash;
    openTransientOverlay({ id: "sheet", close, returnFocus: trigger, history: true });
    expect(location.hash).toBe(hash); expect(history.state["tm:overlay"]).toBeTruthy();
    history.back();
    await vi.waitFor(() => expect(close).toHaveBeenCalledExactlyOnceWith("back"));
    expect(location.hash).toBe(hash); expect(document.activeElement).toBe(trigger);
  });
  it("replaces a menu with help using the same transient history stop", async () => {
    const menu = vi.fn(), help = vi.fn();
    openTransientOverlay({ id: "menu", close: menu, history: true });
    const length = history.length, marker = history.state["tm:overlay"];
    openTransientOverlay({ id: "help", close: help, history: true });
    expect(history.length).toBe(length); expect(history.state["tm:overlay"]).toBe(marker);
    expect(menu).toHaveBeenCalledExactlyOnceWith("replace");
    history.back(); await vi.waitFor(() => expect(help).toHaveBeenCalledExactlyOnceWith("back"));
  });
  it("consumes a transient menu stop before changing the route", async () => {
    const close = vi.fn(), navigate = vi.fn(() => { location.hash = "#/settings"; });
    openTransientOverlay({ id: "menu", close, history: true });
    navigateFromOverlay(navigate);
    expect(close).toHaveBeenCalledExactlyOnceWith("navigate");
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledOnce());
    expect(location.hash).toBe("#/settings"); expect(history.state?.["tm:overlay"]).toBeUndefined();
    history.back(); await vi.waitFor(() => expect(location.hash).toBe(""));
  });
  it.each([false, true])("underlying route links consume the menu stop, including an outside-pointer dismissal (%s)", async (outsideDismissal) => {
    history.pushState({}, "", "#/journey"); history.pushState({}, "", "#/today");
    const link = document.createElement("a"); link.href = "#/profile"; document.body.append(link);
    openTransientOverlay({ id: "menu", close: vi.fn(), history: true });
    if (outsideDismissal) closeTransientOverlay("dismiss");
    link.click();
    await vi.waitFor(() => expect(location.hash).toBe("#/profile"));
    expect(history.state?.["tm:overlay"]).toBeUndefined();
    history.back(); await vi.waitFor(() => expect(location.hash).toBe("#/today"));
    expect(history.state?.["tm:overlay"]).toBeUndefined();
    history.back(); await vi.waitFor(() => expect(location.hash).toBe("#/journey"));
  });

});
