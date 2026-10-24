// O7: per-field "own options" and "saved search results" kept on this phone (demo namespace only).
// Pure: works on any { list, put, delete } store (the demo NsStore in practice). Nothing here touches the network.
import type { Suggestion } from "./research";
import type { TMRecord } from "./types";
import { detectSecret } from "./safety";

export const LIST_CAP = 20;

export interface ListStore {
  list(): TMRecord[];
  put(rec: TMRecord): void;
  delete(id: string): void;
}

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
    id, entity: OWN_ENTITY, ns: "demo", ownerId: "demo-user", schemaVersion: 1, createdAt: at.toISOString(),
    values: {
      "list.field": { state: "value", value: field, label: "DEMO" },
      "list.text": { state: "value", value: clean, label: "DEMO" },
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
    id: `saved-${field}-${key}`, entity: SAVED_ENTITY, ns: "demo", ownerId: "demo-user", schemaVersion: 1, createdAt: at.toISOString(),
    values: {
      "list.field": { state: "value", value: field, label: "DEMO" },
      "list.query": { state: "value", value: key, label: "DEMO" },
      "list.options": { state: "value", value: options.slice(0, 3).map(({ title, snippet, sourceName, sourceUrl, fetchedAt }) => ({ title, snippet, sourceName, sourceUrl, fetchedAt })), label: "DEMO" },
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
