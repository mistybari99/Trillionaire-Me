// TM-REQ-007: saved outside items past their expiry show a stale badge; "recent" wording never appears for them.
import { describe, expect, it } from "vitest";
import { freshnessOf, FRESH_DAYS } from "../src/core/freshness";
import { freshBadge } from "../src/ui/screens";
import { PACKS } from "../src/i18n/packs";

const NOW = new Date("2026-10-31T12:00:00.000Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 3600_000).toISOString();

describe("TM-TST-007 stale badge", () => {
  it("20 of 20 expired items are stale and show the stale badge, never the recent wording", () => {
    for (let i = 0; i < 20; i++) {
      const at = daysAgo(FRESH_DAYS + 1 + i * 7);
      expect(freshnessOf(at, NOW), at).toBe("stale");
      const b = freshBadge(at, "en").querySelector("[data-fresh]")!;
      expect(b.getAttribute("data-fresh")).toBe("stale"); expect(b.textContent).toMatch(/^Old/); expect(b.textContent).not.toMatch(/recent/i);
    }
  });
  it("inside the window is recent; the edge day is still recent", () => {
    expect(freshnessOf(daysAgo(0), NOW)).toBe("recent"); expect(freshnessOf(daysAgo(FRESH_DAYS), NOW)).toBe("recent");
  });
  it("missing, unreadable or future dates are unknown, never recent", () => {
    for (const x of [null, undefined, "", "not a date", daysAgo(-5)]) expect(freshnessOf(x as string, NOW)).toBe("unknown");
    expect(freshBadge("", "en").querySelector("[data-fresh]")!.getAttribute("data-fresh")).toBe("unknown");
  });
  it("date-only stamps (as saved today) work", () => { expect(freshnessOf("2026-10-24", NOW)).toBe("recent"); expect(freshnessOf("2026-08-01", NOW)).toBe("stale"); });
  it("Bangla and Mix badge text use Latin digits and exist", () => {
    for (const l of ["bn", "mix"] as const) for (const k of ["fresh.recent", "fresh.stale", "fresh.unknown"] as const) { expect(PACKS[l][k].length).toBeGreaterThan(5); expect(PACKS[l][k]).not.toMatch(/[০-৯]/); }
  });
});
