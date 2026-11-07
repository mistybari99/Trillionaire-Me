// W5a: "Build Yourself" product line and tagline. App name stays "Trillionaire Me".
// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { QBRAND_BN, QBRAND_EN } from "../src/i18n/q_brand";
import { t } from "../src/i18n/t";
import { brandAboutCard, brandCard } from "../src/ui/brandUi";

const read = (f: string) => readFileSync(f, "utf8");
describe("brand strings", () => {
  it("EN, BN and Mix exist, with the chosen tagline and calm wording", () => {
    for (const lang of ["en", "bn", "mix"] as const) for (const k of ["brand.line", "brand.tagline", "brand.about"] as const) expect(t(k, lang), `${k} ${lang}`).toBeTruthy();
    expect(QBRAND_EN["brand.tagline"]).toBe("Build yourself, one small step at a time.");
    expect(QBRAND_BN["brand.tagline"]).toBe("নিজেকে গড়ুন, ছোট ছোট ধাপে।");
    for (const s of [...Object.values(QBRAND_EN), ...Object.values(QBRAND_BN)]) expect(s).not.toMatch(/guarantee|rank|score|streak|গ্যারান্টি/i);
  });
});
describe("brand is applied", () => {
  it("title keeps the app name and adds the line as a subtitle; splash carries the line and both taglines", () => {
    const html = read("index.html");
    expect(html).toContain("<title>Trillionaire Me · Build Yourself</title>");
    const splash = html.match(/<div id="tm-splash"[\s\S]*?<\/div>/)![0];
    for (const s of ["Build Yourself", QBRAND_EN["brand.tagline"], QBRAND_BN["brand.tagline"]]) expect(splash).toContain(s);
    expect(JSON.parse(read("public/manifest.webmanifest")).name).toBe("Trillionaire Me");
  });
  it("Profile and About render the cards", () => {
    for (const lang of ["en", "bn", "mix"] as const) {
      expect(brandCard(lang).querySelector("[data-brand-tagline]")!.textContent).toBe(t("brand.tagline", lang));
      expect(brandAboutCard(lang).textContent).toContain(t("brand.about", lang));
    }
    expect(read("src/ui/ownerProfileUi.ts")).toContain("brandCard(lang)");
    expect(read("src/ui/settingsUi.ts")).toContain("brandAboutCard(lang)");
  });
  it("docs name the line", () => { expect(read("README.md")).toContain("Build Yourself"); expect(read("DECISIONS_LOG.md")).toContain("Build Yourself"); });
});
