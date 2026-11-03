// Shared list of concrete screen addresses for crawl tests (link check, field reach).
import { TOPICS } from "../src/library/topics";
import { CATEGORIES, ROWS } from "../src/ui/settingsRegistry";

export const STATIC = ["/start", "/today", "/journey", "/journey/log", "/journey/wheel", "/journey/universe", "/journey/goals", "/journey/horizon", "/diary", "/diary/intake", "/diary/intake/2",
  "/diary/plan", "/diary/money", "/capture", "/journey/report", "/journey/print", "/journey/print/report", "/journey/print/plan", "/journey/print/handover", "/journey/week", "/journey/month", "/journey/decide", "/journey/mine", "/journey/legs", "/journey/leak", "/journey/review", "/journey/risks",
  "/journey/history", "/journey/northstar", "/journey/kpi", "/journey/boards", "/journey/gates", "/journey/reality", "/diary/ventures", "/diary/team", "/diary/health", "/stuck", "/topics", "/journey/art", "/habits", "/cards", "/hadith", "/notes", "/deen", "/deen/plans", "/more/status", "/more/fields",
  "/more/glossary", "/more/safety", "/more/dictionary", "/more/where", "/more/library", "/more/halal-flags", "/settings", "/settings/about", "/settings/connections"];

export function allPaths(extra: string[] = []): string[] {
  const p = [...STATIC, ...extra];
  for (const c of CATEGORIES) p.push(`/settings/${c}`);
  for (const r of ROWS) p.push(`/settings/${r.cat}/${r.id}`);
  for (const t of TOPICS) p.push(`/topic/${t.id}`);
  return [...new Set(p)];
}

