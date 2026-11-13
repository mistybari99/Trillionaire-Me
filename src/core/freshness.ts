// TM-REQ-007: saved outside information (for example a Wikipedia option) carries the date it was fetched.
// Past its expiry it is "stale"; an unreadable date is "unknown", never "recent". Pure.
export const FRESH_DAYS = 30;
export type Freshness = "recent" | "stale" | "unknown";

export function freshnessOf(fetchedAt: string | null | undefined, now: Date, maxAgeDays = FRESH_DAYS): Freshness {
  if (!fetchedAt) return "unknown";
  const t = Date.parse(fetchedAt);
  if (!Number.isFinite(t) || t > now.getTime() + 24 * 3600_000) return "unknown";
  return now.getTime() - t > maxAgeDays * 24 * 3600_000 ? "stale" : "recent";
}
