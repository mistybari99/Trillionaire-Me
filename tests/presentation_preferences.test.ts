import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPresentationPreferences, resetPresentationPreferences, setPresentationPreference, PRESENTATION_DEFAULTS } from "../src/ui/presentationPreferences";
beforeEach(() => { vi.restoreAllMocks(); localStorage.clear(); resetPresentationPreferences(); });
afterEach(() => { vi.restoreAllMocks(); resetPresentationPreferences(); });
describe("per-device presentation choices", () => {
  it("validates old and invalid stored values with safe defaults", () => {
    localStorage.setItem("tm:ui:helpPlacement", "unexpected");
    expect(getPresentationPreferences()).toEqual(PRESENTATION_DEFAULTS);
    setPresentationPreference("helpVisuals", "illustrated");
    expect(getPresentationPreferences().helpVisuals).toBe("illustrated");
    expect(getPresentationPreferences().helpContent).toBe("guide");
  });
  it("keeps an honest session choice when storage fails and retries", () => {
    const blocked = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw Error("full"); });
    expect(setPresentationPreference("helpPlacement", "sheet").saved).toBe(false);
    expect(getPresentationPreferences().helpPlacement).toBe("sheet");
    blocked.mockRestore();
    expect(setPresentationPreference("helpPlacement", "inline").saved).toBe(true);
    expect(localStorage.getItem("tm:ui:helpPlacement")).toBe("inline");
  });
  it("resets only presentation keys even when removal fails", () => {
    localStorage.setItem("tm:consent:real:v1", "keep"); localStorage.setItem("tm:real:profile", "keep");
    setPresentationPreference("tabNavigation", "menu");
    const blocked = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => { throw Error("blocked"); });
    expect(resetPresentationPreferences().saved).toBe(false);
    expect(getPresentationPreferences()).toEqual(PRESENTATION_DEFAULTS);
    expect(localStorage.getItem("tm:real:profile")).toBe("keep"); expect(localStorage.getItem("tm:consent:real:v1")).toBe("keep");
    blocked.mockRestore();
  });
});
