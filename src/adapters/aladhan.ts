// Aladhan prayer-time provider (free, no key, no account). With the Wikipedia adapter this is the only file that calls the network.
// It sends a GET with the city, country, method, Asr school and month in the address. No cookies, no referrer, no body, no user data.
import { parseAladhanMonth, monthUrl, type DayTimes, type MonthQuery, type PrayerSourcePort } from "../core/prayerSource";
import type { PortResult } from "../core/ports";

type Fetch = (url: string, init?: RequestInit) => Promise<{ ok: boolean; json(): Promise<unknown> }>;
export const TIMEOUT_MS = 10_000;

export function aladhanSource(doFetch: Fetch = (u, i) => fetch(u, i)): PrayerSourcePort {
  return {
    id: "prayerTimes",
    async fetchMonth(q: MonthQuery): Promise<PortResult<Record<string, DayTimes>>> {
      const ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
      const timer = ctl ? setTimeout(() => ctl.abort(), TIMEOUT_MS) : null;
      try {
        const res = await doFetch(monthUrl(q), { method: "GET", credentials: "omit", referrerPolicy: "no-referrer", cache: "no-store", ...(ctl ? { signal: ctl.signal } : {}) });
        if (!res.ok) return { ok: false, reason: "error", message: "service answered with an error" };
        const days = parseAladhanMonth(await res.json());
        return days ? { ok: true, value: days } : { ok: false, reason: "error", message: "answer not understood" };
      } catch { return { ok: false, reason: "error", message: "could not reach the service" }; }
      finally { if (timer) clearTimeout(timer); }
    },
  };
}
