import { afterEach, describe, expect, it, vi } from "vitest";
import { observeNavLayout } from "../src/ui/navLayout";

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.replaceChildren();
  document.documentElement.style.removeProperty("--nav-height");
  document.documentElement.style.removeProperty("--update-clearance");
});

describe("navigation clearance", () => {
  it("uses its owning document in queued callbacks and ignores callbacks after cleanup", () => {
    let onMutation = () => {};
    let onResize = () => {};
    vi.stubGlobal("MutationObserver", class {
      constructor(callback: () => void) { onMutation = callback; }
      observe() {}
      disconnect() {}
    });
    vi.stubGlobal("ResizeObserver", class {
      constructor(callback: () => void) { onResize = callback; }
      observe() {}
      disconnect() {}
    });
    const doc = document;
    const nav = doc.createElement("nav");
    vi.spyOn(nav, "getBoundingClientRect").mockReturnValue({ height: 112 } as DOMRect);
    doc.body.append(nav);
    const stop = observeNavLayout(nav);
    const query = vi.spyOn(doc, "getElementById");
    vi.stubGlobal("document", undefined);
    expect(() => { onMutation(); onResize(); }).not.toThrow();
    expect(doc.documentElement.style.getPropertyValue("--nav-height")).toBe("112px");
    stop();
    query.mockClear();
    expect(() => { onMutation(); onResize(); }).not.toThrow();
    expect(query).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
  it("tracks wrapped navigation and ignores a disconnected observer after rerender", () => {
    const callbacks: Array<() => void> = [];
    const disconnect = vi.fn();
    vi.stubGlobal("ResizeObserver", class {
      constructor(callback: () => void) { callbacks.push(callback); }
      observe() {}
      unobserve() {}
      disconnect = disconnect;
    });
    const nav = document.createElement("nav");
    let height = 57;
    vi.spyOn(nav, "getBoundingClientRect").mockImplementation(() => ({ height } as DOMRect));
    document.body.append(nav);
    const stop = observeNavLayout(nav);
    expect(document.documentElement.style.getPropertyValue("--nav-height")).toBe("57px");
    height = 129.2; // Wrapped labels plus safe-area padding are one rendered box.
    callbacks[0]!();
    expect(document.documentElement.style.getPropertyValue("--nav-height")).toBe("130px");
    stop();
    nav.remove();
    const replacement = document.createElement("nav");
    vi.spyOn(replacement, "getBoundingClientRect").mockReturnValue({ height: 88 } as DOMRect);
    document.body.append(replacement);
    const stopReplacement = observeNavLayout(replacement);
    callbacks[0]!();
    expect(document.documentElement.style.getPropertyValue("--nav-height")).toBe("88px");
    expect(disconnect).toHaveBeenCalledTimes(1);
    stopReplacement();
  });

  it("reserves an update banner added outside app and releases that clearance when removed", async () => {
    vi.stubGlobal("ResizeObserver", undefined);
    const nav = document.createElement("nav");
    vi.spyOn(nav, "getBoundingClientRect").mockReturnValue({ height: 112 } as DOMRect);
    document.body.append(nav);
    const stop = observeNavLayout(nav);
    const banner = document.createElement("div");
    banner.id = "update-banner";
    vi.spyOn(banner, "getBoundingClientRect").mockReturnValue({ height: 180 } as DOMRect);
    document.body.append(banner);
    await Promise.resolve();
    expect(document.documentElement.style.getPropertyValue("--update-clearance")).toBe("192px");
    banner.remove();
    await Promise.resolve();
    expect(document.documentElement.style.getPropertyValue("--update-clearance")).toBe("0px");
    stop();
  });

  it("remeasures on resize without ResizeObserver and removes its listener on cleanup", () => {
    vi.stubGlobal("ResizeObserver", undefined);
    const nav = document.createElement("nav");
    let height = 56;
    vi.spyOn(nav, "getBoundingClientRect").mockImplementation(() => ({ height } as DOMRect));
    document.body.append(nav);
    const stop = observeNavLayout(nav);
    height = 112;
    window.dispatchEvent(new Event("resize"));
    expect(document.documentElement.style.getPropertyValue("--nav-height")).toBe("112px");
    stop();
    height = 168;
    window.dispatchEvent(new Event("resize"));
    expect(document.documentElement.style.getPropertyValue("--nav-height")).toBe("112px");
  });
});
