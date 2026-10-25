import { describe, expect, it } from "vitest";
import { buildNotification, parseNotifyPrefs } from "../src/core/notify";
import type { PrivacyClass } from "../src/catalog/types";

const item = (privacy: PrivacyClass) => ({ privacy, title: { bn: "গোপন-শিরোনাম", en: "secret-title" }, body: { bn: "গোপন-বিবরণ", en: "secret-body" } });
describe("TM-TST-155 notification privacy (default hides details)", () => {
  it("worship, health, financial, third-party never leak by default", () => {
    for (const p of ["worship", "health", "financial", "third_party"] as const) {
      const n = JSON.stringify(buildNotification(item(p))); expect(n).not.toMatch(/secret|গোপন/);
    }
  });
  it("ordinary reminders show their text; a category can be opened on purpose", () => {
    expect(buildNotification(item("general")).title.en).toBe("secret-title");
    expect(buildNotification(item("worship"), { worship: true }).title.en).toBe("secret-title");
  });
  it("stored settings: only known categories set to true count", () => {
    expect(parseNotifyPrefs(null)).toEqual({});
    expect(parseNotifyPrefs({ worship: "yes", health: 1, bogus: true })).toEqual({});
  });
});
