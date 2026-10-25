// O8 (ROADMAP §2): lock-screen privacy. Automated part only; the on-device lock-screen check is Owner-only.
import { describe, expect, it } from "vitest";
import { buildNotification, DEFAULT_NOTIFY_PREFS, NEUTRAL_BODY, NEUTRAL_TITLE, NOTIFY_CATEGORIES, notifyText, parseNotifyPrefs, type NotifyCategory } from "../src/core/notify";
import { swapMixTerms } from "../src/i18n/packs";
import type { PrivacyClass } from "../src/catalog/types";

const SENSITIVE: NotifyCategory[] = ["worship", "health", "financial", "third_party"];
const item = (privacy: PrivacyClass) => ({
  privacy,
  title: { en: "Fajr with the family, 500 BDT owed", bn: "ফজর ও পরিবার, ৫০০ টাকা বাকি" },
  body: { en: "Call the clinic about the blood test", bn: "ক্লিনিকে রক্ত পরীক্ষার কথা বলুন" },
});

describe("TM-TST-155 O8 default: sensitive details hidden on the lock screen", () => {
  it("the default settings hide all four categories", () => {
    expect(DEFAULT_NOTIFY_PREFS).toEqual({});
    expect([...NOTIFY_CATEGORIES].sort()).toEqual([...SENSITIVE].sort());
    for (const c of SENSITIVE) expect(parseNotifyPrefs(DEFAULT_NOTIFY_PREFS)[c]).toBeUndefined();
  });
  it("each sensitive category returns the neutral text and no item words, in both languages", () => {
    for (const c of SENSITIVE) {
      const n = buildNotification(item(c));
      expect(n.title).toEqual(NEUTRAL_TITLE);
      expect(n.body).toEqual(NEUTRAL_BODY);
      const s = JSON.stringify(n);
      expect(s).not.toMatch(/Fajr|BDT|clinic|blood|ফজর|টাকা|ক্লিনিক|রক্ত|family|পরিবার/);
    }
  });
  it("ordinary (general and personal) reminders are not hidden", () => {
    for (const p of ["general", "personal"] as const) expect(buildNotification(item(p)).title.en).toBe("Fajr with the family, 500 BDT owed");
  });
});

describe("TM-TST-155 O8 opt-in per category", () => {
  it("turning on one category shows only that category", () => {
    const prefs = { health: true };
    expect(buildNotification(item("health"), prefs).title.en).toBe(item("health").title.en);
    for (const c of ["worship", "financial", "third_party"] as const) expect(buildNotification(item(c), prefs).title).toEqual(NEUTRAL_TITLE);
  });
  it("each category can be opened on its own, and closed again", () => {
    for (const c of SENSITIVE) {
      expect(buildNotification(item(c), { [c]: true }).title.en).toBe(item(c).title.en);
      expect(buildNotification(item(c), { [c]: false }).title).toEqual(NEUTRAL_TITLE);
    }
  });
  it("a value other than true (string, number, null) never opens a category", () => {
    for (const bad of ["yes", 1, null, "true"]) {
      expect(parseNotifyPrefs({ worship: bad })).toEqual({});
      expect(buildNotification(item("worship"), { worship: bad as unknown as boolean }).title).toEqual(NEUTRAL_TITLE);
    }
  });
});

describe("TM-TST-155 O8 neutral text", () => {
  it("English default is 'A reminder is waiting' and reveals nothing", () => {
    expect(notifyText(NEUTRAL_TITLE, "en")).toBe("A reminder is waiting");
    expect(NEUTRAL_BODY.en).toBe("Open the app to see it");
  });
  it("Bangla text is authored in bn; Mix is derived from the Bangla text, not authored separately", () => {
    expect(notifyText(NEUTRAL_TITLE, "bn")).toBe(NEUTRAL_TITLE.bn);
    expect(notifyText(NEUTRAL_TITLE, "mix")).toBe(swapMixTerms(NEUTRAL_TITLE.bn));
    expect(notifyText(NEUTRAL_BODY, "mix")).toBe(swapMixTerms(NEUTRAL_BODY.bn));
  });
  it("neutral text has no judging, streak, rank or grade words", () => {
    const all = `${NEUTRAL_TITLE.en} ${NEUTRAL_BODY.en} ${NEUTRAL_TITLE.bn} ${NEUTRAL_BODY.bn}`.toLowerCase();
    expect(all).not.toMatch(/streak|rank|grade|score|late|missed|fail|overdue|শাস্তি|ব্যর্থ|পিছিয়ে/);
  });
});

describe("TM-TST-155 O8 settings screen on More", () => {
  it("four category rows start on Hide; choosing Show for one stores only that one; the lock preview stays neutral", async () => {
    const { render } = await import("../src/app");
    const { prefs } = await import("../src/ui/state");
    localStorage.clear(); localStorage.setItem("tm:ui:lang", "en"); document.body.innerHTML = '<div id="app"></div>';
    location.hash = "#/more"; render();
    const rows = [...document.querySelectorAll<HTMLElement>("[data-lock-cat]")];
    expect(rows.map((r) => r.dataset.lockCat)).toEqual([...NOTIFY_CATEGORIES]);
    for (const r of rows) expect(r.querySelector("[aria-pressed='true']")?.textContent).toBe("Hide");
    expect(document.querySelector("[data-lock-settings]")!.textContent).toContain("A reminder is waiting");
    const health = rows.find((r) => r.dataset.lockCat === "health")!;
    [...health.querySelectorAll("button")].find((b) => b.textContent === "Show details")!.click();
    expect(prefs.notifyShow).toEqual({ health: true });
    render(); // main.ts re-renders on hashchange; the test has no main.ts, so render directly
    const again = [...document.querySelectorAll<HTMLElement>("[data-lock-cat='health'] [aria-pressed='true']")][0];
    expect(again?.textContent).toBe("Show details");
    expect([...document.querySelectorAll<HTMLElement>("[data-lock-cat='worship'] [aria-pressed='true']")][0]?.textContent).toBe("Hide");
  });
});
