// Azan recording slots (pure). Up to 4 recordings can be added to public/audio/ (see docs/azan.md). A slot that has no file is "not added"
// and cannot be chosen. Slot 1 also accepts the older names azan.mp3 / azan-fajr.mp3. The optional manifest (public/audio/azan-manifest.json)
// only gives a slot a neutral label and a source or licence note; file names always follow the pattern, so a bad manifest can never break playback.
import { probeAudio, type HeadFetch } from "./prayerSound";
import type { PrayerKey } from "./prayer";

export const AZAN_SLOT_IDS = ["1", "2", "3", "4"] as const;
export type AzanSlotId = (typeof AZAN_SLOT_IDS)[number];
export const isSlotId = (v: unknown): v is AzanSlotId => typeof v === "string" && (AZAN_SLOT_IDS as readonly string[]).includes(v);
export const MANIFEST_URL = "./audio/azan-manifest.json";

export interface AzanSlotDef { id: AzanSlotId; files: string[]; fajrFiles: string[]; label?: { en: string; bn: string }; source?: string }
/** What was found for one slot: the file to play for any prayer (main) and for Fajr (fajr, optional). null = not added. */
export interface AzanSlotState { id: AzanSlotId; main: string | null; fajr: string | null; label?: { en: string; bn: string }; source?: string }
export interface AzanAvailability { slots: AzanSlotState[] }

export function defaultSlots(): AzanSlotDef[] {
  return AZAN_SLOT_IDS.map((id) => ({
    id,
    files: id === "1" ? ["./audio/azan-1.mp3", "./audio/azan.mp3"] : [`./audio/azan-${id}.mp3`],
    fajrFiles: id === "1" ? ["./audio/azan-1-fajr.mp3", "./audio/azan-fajr.mp3"] : [`./audio/azan-${id}-fajr.mp3`],
  }));
}

const cleanText = (v: unknown, max: number): string | undefined => (typeof v === "string" && v.trim() && v.length <= max ? v.trim() : undefined);

/** Slots with the optional label and source note from the manifest. Anything unreadable is ignored; the defaults stay. Never throws. */
export function parseManifest(raw: unknown): AzanSlotDef[] {
  const defs = defaultSlots();
  const list = typeof raw === "object" && raw !== null && Array.isArray((raw as { slots?: unknown }).slots) ? ((raw as { slots: unknown[] }).slots) : [];
  for (const item of list) {
    if (typeof item !== "object" || item === null) continue;
    const e = item as { id?: unknown; label?: unknown; source?: unknown };
    const id = typeof e.id === "number" ? String(e.id) : e.id;
    const def = isSlotId(id) ? defs.find((d) => d.id === id) : undefined;
    if (!def) continue;
    const l = typeof e.label === "object" && e.label !== null ? (e.label as { en?: unknown; bn?: unknown }) : null;
    const en = cleanText(l?.en, 60), bn = cleanText(l?.bn, 60);
    if (en && bn) def.label = { en, bn };
    const source = cleanText(e.source, 200);
    if (source) def.source = source;
  }
  return defs;
}

const firstOf = async (fetchFn: HeadFetch, urls: string[]): Promise<string | null> => {
  for (const u of urls) if (await probeAudio(fetchFn, u)) return u;
  return null;
};

/** Looks for the files of every slot (same-origin HEAD only). loadJson reads the manifest; a missing or broken one is fine. Never throws. */
export async function detectAzan(fetchFn: HeadFetch, loadJson?: () => Promise<unknown>): Promise<AzanAvailability> {
  let raw: unknown = null;
  try { raw = loadJson ? await loadJson() : null; } catch { raw = null; }
  const defs = parseManifest(raw);
  const slots = await Promise.all(defs.map(async (d): Promise<AzanSlotState> => {
    const main = await firstOf(fetchFn, d.files);
    const fajr = main ? await firstOf(fetchFn, d.fajrFiles) : null;
    return { id: d.id, main, fajr, ...(d.label ? { label: d.label } : {}), ...(d.source ? { source: d.source } : {}) };
  }));
  return { slots };
}

export const NO_AZAN: AzanAvailability = { slots: defaultSlots().map((d) => ({ id: d.id, main: null, fajr: null })) };
export const hasAnyAzan = (a: AzanAvailability): boolean => a.slots.some((s) => s.main !== null);

/** The slot that plays: the chosen one if it is added, else the first one that is added, else null. "" means "no choice yet". */
export function chooseSlot(a: AzanAvailability, pref: string): AzanSlotState | null {
  const added = a.slots.filter((s) => s.main !== null);
  return added.find((s) => s.id === pref) ?? added[0] ?? null;
}

/** File to play for a prayer, or null when nothing was added. Fajr prefers the slot's own Fajr file, then its main one. */
export function azanFileFor(prayer: PrayerKey, a: AzanAvailability, pref = ""): string | null {
  const s = chooseSlot(a, pref);
  if (!s) return null;
  return prayer === "fajr" && s.fajr ? s.fajr : s.main;
}

/** Parse the saved choice: only "1" to "4" are kept; anything else is "" (default: first added). */
export const parseSlotPref = (v: unknown): "" | AzanSlotId => (isSlotId(v) ? v : "");
