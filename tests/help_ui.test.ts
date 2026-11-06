import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
// setup.ts preloads screens and their help imports. Clear that module cache before
// importing this subject so the lazy-data spies observe the real help UI calls.
vi.hoisted(() => { vi.resetModules(); });
import { helpTrigger } from "../src/ui/helpUi";
import { closeTransientOverlay, setOverlayContext } from "../src/ui/overlayCoordinator";
import { fieldHelp } from "../src/ui/components";
import { fieldById } from "../src/catalog/fields";

const { prefs, guide, mine } = vi.hoisted(() => ({
  prefs: { helpPlacement: "inline", helpVisuals: "diagram", helpContent: "guide" },
  guide: vi.fn(), mine: vi.fn(),
}));
vi.mock("../src/ui/presentationPreferences", () => ({ getPresentationPreferences: () => prefs }));
vi.mock("../src/ui/helpTopics", async (original) => ({ ...await original<object>(), renderGuide: guide }));
vi.mock("../src/ui/helpOwnMaps", () => ({ renderOwnMap: mine }));
const open = () => document.querySelector<HTMLButtonElement>("[data-help-topic]")!.click();
const button = (text: string) => [...document.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent === text)!;

beforeEach(async () => {
  closeTransientOverlay("context");
  await vi.waitFor(() => expect(history.state?.["tm:overlay"]).toBeUndefined());
  document.body.replaceChildren(); history.replaceState({}, "", "/");
  Object.assign(prefs, { helpPlacement: "inline", helpVisuals: "diagram", helpContent: "guide" });
  guide.mockReset().mockImplementation(() => Object.assign(document.createElement("p"), { textContent: "A general explanation" }));
  mine.mockReset().mockImplementation(() => Object.assign(document.createElement("p"), { textContent: "Private current goal" }));
  // Exercise the compatibility focus trap independently of native dialog support in the host.
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { value: undefined, configurable: true });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { value: function(this: HTMLDialogElement) { this.removeAttribute("open"); }, configurable: true });
});
afterEach(async () => { closeTransientOverlay("context"); await vi.waitFor(() => expect(history.state?.["tm:overlay"]).toBeUndefined()); document.body.replaceChildren(); });

describe("shared contextual help", () => {
  it.each(["inline", "sheet"].flatMap((helpPlacement) => ["diagram", "illustrated"].flatMap((helpVisuals) => ["guide", "guide-and-mine"].map((helpContent) => ({ helpPlacement, helpVisuals, helpContent })))))
    ("honours $helpPlacement / $helpVisuals / $helpContent without reading user data before My map", ({ helpPlacement, helpVisuals, helpContent }) => {
      Object.assign(prefs, { helpPlacement, helpVisuals, helpContent });
      const app = document.createElement("main"); app.id = "app";
      app.append(helpTrigger("goals", "en", { recordId: "goal-1" })); document.body.append(app); open();
      expect(guide).toHaveBeenCalledWith("goals", "en", helpVisuals);
      expect(mine).not.toHaveBeenCalled();
      expect(document.querySelector("dialog") !== null).toBe(helpPlacement === "sheet");
      if (helpPlacement === "sheet") expect(app.querySelector("dialog")).toBeNull();
      expect(document.querySelectorAll('[role="tab"]').length).toBe(helpContent === "guide-and-mine" ? 2 : 0);
      if (helpContent === "guide-and-mine") {
        button("My map").click(); expect(mine).toHaveBeenCalledWith("goals", "en", { recordId: "goal-1" });
        expect(document.body.textContent).toContain("Private current goal");
        button("Guide").click(); expect(document.body.textContent).not.toContain("Private current goal");
      }
    });

  it("preserves the input node, unsaved draft and selection while opening inline help and switching topics", () => {
    const app = document.createElement("main"); app.id = "app";
    const input = document.createElement("textarea"); input.value = "unfinished draft";
    app.append(input, helpTrigger("goals", "en"), helpTrigger("money", "en")); document.body.append(app);
    input.focus(); input.setSelectionRange(3, 8); const hash = location.hash;
    open(); document.querySelectorAll<HTMLButtonElement>("[data-help-topic]")[1]!.click();
    expect(document.querySelectorAll(".context-help")).toHaveLength(1);
    expect(document.querySelector("textarea")).toBe(input);
    expect(input.value).toBe("unfinished draft"); expect(input.selectionStart).toBe(3); expect(input.selectionEnd).toBe(8);
    expect(location.hash).toBe(hash);
    expect(document.querySelector('[data-help-topic="goals"]')?.getAttribute("aria-expanded")).toBe("false");
  });

  it("traps sheet focus and closes on Escape, restores its trigger and clears private DOM", async () => {
    Object.assign(prefs, { helpPlacement: "sheet", helpContent: "guide-and-mine" });
    const app = document.createElement("main"); app.id = "app";
    const input = document.createElement("textarea"); input.value = "private unfinished draft";
    app.append(input, helpTrigger("goals", "en")); document.body.append(app);
    input.focus(); input.setSelectionRange(2, 6); open();
    const dialog = document.querySelector("dialog")!;
    const close = button("Close");
    expect(app.contains(dialog)).toBe(false);
    expect(document.activeElement).toBe(close);
    expect(app.hasAttribute("inert")).toBe(true);
    expect(mine).not.toHaveBeenCalled();
    button("My map").click(); const mineTab = button("My map");
    close.focus(); close.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true }));
    expect(document.activeElement).toBe(mineTab);
    mineTab.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    expect(document.activeElement).toBe(close);
    dialog.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(document.querySelector("dialog")).toBeNull(); expect(document.body.textContent).not.toContain("Private current goal");
    expect(document.activeElement).toBe(document.querySelector("[data-help-topic]"));
    expect(app.hasAttribute("inert")).toBe(false);
    expect(app.querySelector("textarea")).toBe(input);
    expect(input.value).toBe("private unfinished draft");
    expect([input.selectionStart, input.selectionEnd]).toEqual([2, 6]);
    await vi.waitFor(() => expect(history.state?.["tm:overlay"]).toBeUndefined());
  });

  it.each(["route", "namespace", "locked", "consent revoked"])("clears a private map when %s context changes", (change) => {
    prefs.helpContent = "guide-and-mine"; setOverlayContext("initial");
    document.body.append(helpTrigger("goals", "en")); open(); button("My map").click();
    setOverlayContext(change);
    expect(document.querySelector(".context-help")).toBeNull();
    expect(document.body.textContent).not.toContain("Private current goal");
    expect(document.querySelector("[data-help-topic]")?.getAttribute("aria-expanded")).toBe("false");
  });

  it("keeps required format and privacy guidance visible beside a named, separate field-help control", () => {
    const field = fieldById("profile.display_name")!;
    document.body.append(fieldHelp(field, "en"));
    const trigger = document.querySelector("button")!;
    expect(trigger.getAttribute("aria-label")).toContain(field.label.en);
    expect(document.querySelector("details")).toBeNull(); expect(trigger.closest("label,a")).toBeNull();
    expect(document.querySelector(".help-essential")?.textContent).toBeTruthy();
    expect(document.body.textContent).toContain("Privacy");
    expect(mine).not.toHaveBeenCalled();
  });
});
