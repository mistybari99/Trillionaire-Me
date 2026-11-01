// O7: per-field "own options" and "saved search results" kept on this phone, in the ACTIVE namespace (demo in demo mode, real in real mode; never mixed).
// Pure: works on any { list, put, delete } store (the demo NsStore in practice). Nothing here touches the network.
import type { Suggestion } from "./research";
import type { Label, Namespace, TMRecord } from "./types";
import { detectSecret } from "./safety";

export const LIST_CAP = 20;

export interface ListStore {
  /** Namespace of the store; a store without one is treated as demo. */
  readonly ns?: Namespace;
  list(): TMRecord[];
  put(rec: TMRecord): void;
  delete(id: string): void;
}

const nsOf = (s: ListStore): Namespace => s.ns ?? "demo";
/** Demo values are DEMO; what the user typed in real mode is FACT; saved outside results are EXTERNAL in real mode. */
const labelOf = (ns: Namespace, kind: "typed" | "external"): Label => (ns === "demo" ? "DEMO" : kind === "typed" ? "FACT" : "EXTERNAL");
const ownerOf = (ns: Namespace) => (ns === "real" ? "owner" : "demo-user");

export const OWN_ENTITY = "own_option";
export const SAVED_ENTITY = "saved_search";

/** Case-folded, whitespace-collapsed key so "Book keeping" and " book  keeping " are one entry. Bangla is unaffected. */
export const termKey = (s: string): string => s.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();

/**
 * Cap rule: keep the newest `cap` items; return the ids to remove (oldest first).
 * Ties on time break by id so the order is deterministic.
 */
export function oldestToRemove(items: { id: string; at: string }[], cap = LIST_CAP): string[] {
  if (items.length <= cap) return [];
  const sorted = [...items].sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return sorted.slice(0, items.length - cap).map((i) => i.id);
}

const fieldRecs = (store: ListStore, entity: string, field: string) =>
  store.list().filter((r) => r.entity === entity && r.values["list.field"]?.state === "value" && r.values["list.field"].value === field);

function enforceCap(store: ListStore, entity: string, field: string): void {
  const recs = fieldRecs(store, entity, field);
  for (const id of oldestToRemove(recs.map((r) => ({ id: r.id, at: r.createdAt })))) store.delete(id);
}

export type OwnSaveResult = "saved" | "empty" | "secret" | "duplicate_updated";

/** Save what the user typed as an own option for one field. Passwords/IDs/card-like input is refused, never stored. */
export function saveOwnOption(store: ListStore, field: string, text: string, at: Date): OwnSaveResult {
  const clean = text.normalize("NFC").trim().replace(/\s+/g, " ");
  if (!clean) return "empty";
  if (detectSecret(clean)) return "secret";
  const key = termKey(clean);
  const id = `own-${field}-${key}`;
  const existed = store.list().some((r) => r.id === id);
  store.put({
    id, entity: OWN_ENTITY, ns: nsOf(store), ownerId: ownerOf(nsOf(store)), schemaVersion: 1, createdAt: at.toISOString(),
    values: {
      "list.field": { state: "value", value: field, label: labelOf(nsOf(store), "typed") },
      "list.text": { state: "value", value: clean, label: labelOf(nsOf(store), "typed") },
    },
  });
  enforceCap(store, OWN_ENTITY, field);
  return existed ? "duplicate_updated" : "saved";
}

/** Own options for one field, newest first. */
export function ownOptions(store: ListStore, field: string): string[] {
  return fieldRecs(store, OWN_ENTITY, field)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
    .map((r) => String(r.values["list.text"]?.state === "value" ? r.values["list.text"].value : ""))
    .filter(Boolean);
}

/** Keep the 2–3 results the user saw for this term, so the same term works offline later. Re-saving moves it to newest. */
export function saveSearchResults(store: ListStore, field: string, query: string, options: Suggestion[], at: Date): void {
  const key = termKey(query);
  if (!key || options.length < 2) return;
  if (detectSecret(key)) return;
  store.put({
    id: `saved-${field}-${key}`, entity: SAVED_ENTITY, ns: nsOf(store), ownerId: ownerOf(nsOf(store)), schemaVersion: 1, createdAt: at.toISOString(),
    values: {
      "list.field": { state: "value", value: field, label: labelOf(nsOf(store), "typed") },
      "list.query": { state: "value", value: key, label: labelOf(nsOf(store), "typed") },
      "list.options": { state: "value", value: options.slice(0, 3).map(({ title, snippet, sourceName, sourceUrl, fetchedAt }) => ({ title, snippet, sourceName, sourceUrl, fetchedAt })), label: labelOf(nsOf(store), "external") },
    },
  });
  enforceCap(store, SAVED_ENTITY, field);
}

/** Saved results for this term on this field; [] when nothing is saved. Read-only, no network. */
export function savedSearchResults(store: ListStore, field: string, query: string): Suggestion[] {
  const key = termKey(query);
  const rec = store.list().find((r) => r.entity === SAVED_ENTITY && r.id === `saved-${field}-${key}`);
  const v = rec?.values["list.options"];
  if (!v || v.state !== "value" || !Array.isArray(v.value)) return [];
  return (v.value as Omit<Suggestion, "id">[]).map((o, i) => ({ ...o, id: `saved-${i + 1}` }));
}

/**
 * One-time repair (Block 9 step 6). Before this fix, own options and saved search results were always written to the demo namespace, even in real mode.
 * When the user is in real mode with the tick given, those two kinds of record (and nothing else) are moved to the real namespace and re-labelled.
 * Secret-looking text is dropped, not moved. Returns how many records moved. Run once per device (the caller keeps a flag).
 */
export function moveListsToReal(demo: ListStore, real: ListStore): number {
  let n = 0;
  for (const r of demo.list()) {
    if (r.entity !== OWN_ENTITY && r.entity !== SAVED_ENTITY) continue;
    const texts = Object.values(r.values).map((v) => (v.state === "value" && typeof v.value === "string" ? v.value : ""));
    const secret = texts.some((x) => x && detectSecret(x));
    if (!secret) {
      const values: TMRecord["values"] = {};
      for (const [k, v] of Object.entries(r.values)) values[k] = v.state === "value" ? { ...v, label: labelOf("real", k === "list.options" ? "external" : "typed") } : v;
      real.put({ ...r, ns: "real", ownerId: ownerOf("real"), values }); n++;
    }
    demo.delete(r.id);
  }
  return n;
}
