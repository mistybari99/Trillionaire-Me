import { describe, expect, it } from "vitest";
import { buildNotification } from "../src/core/notify";
import type { PrivacyClass } from "../src/catalog/types";

const item = (privacy: PrivacyClass) => ({ privacy, title: { bn: "গোপন-শিরোনাম", en: "secret-title" }, body: { bn: "গোপন-বিবরণ", en: "secret-body" } });
describe("notification privacy (default hides details)", () => {
  it("worship, health, financial, third-party never leak by default", () => {
    for (const p of ["worship", "health", "financial", "third_party"] as const) {
      const n = JSON.stringify(buildNotification(item(p))); expect(n).not.toMatch(/secret|গোপন/);
    }
  });
  it("ordinary reminders show their text; user can turn hiding off", () => {
    expect(buildNotification(item("general")).title.en).toBe("secret-title");
    expect(buildNotification(item("worship"), { hideDetails: false }).title.en).toBe("secret-title");
  });
});
