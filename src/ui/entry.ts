// Entry forms (D-B, owner approved 25 Oct 2026). A typed record is saved as REAL only after the consent tick
// (More > Demo & real data). Without the tick the form shows the prompt and saves nothing.
// Reads go to both namespaces; every record keeps its own ns and label, so DEMO and real stay distinct.
import { h } from "./dom";
import { t } from "../i18n/t";
import type { Locale } from "../i18n/registry";
import { readConsent } from "../core/consent";
import { visibleRecords } from "../core/dataMode";
import type { FieldValue, Label, Namespace, TMRecord } from "../core/types";
import { consentKv, prefs, store } from "./state";

/** Owner id on real records. Demo records keep "demo-user". */
export const REAL_OWNER = "owner";
export const ownerOf = (ns: Namespace): string => (ns === "real" ? REAL_OWNER : "demo-user");

/** The namespace the app is showing and writing to right now (owner rule: demo and real never mix). */
export const activeNs = (): Namespace => prefs.dataMode;

/** Real consent tick given (D-B). */
export const realConsent = (): boolean => readConsent(consentKv);

/** True when an entry may be saved: always in demo mode (DEMO data), only after the consent tick in real mode. */
export const consentOn = (): boolean => activeNs() === "demo" || realConsent();

/** Namespace a new entry is written to, or null while real mode has no consent. */
export const entryNs = (): Namespace | null => (consentOn() ? activeNs() : null);

/** Label for values the app writes into a namespace. Demo values are DEMO; real values the user typed are FACT. */
export const labelFor = (ns: Namespace): Label => (ns === "real" ? "FACT" : "DEMO");

/** A value the user typed into an entry. Relabelled to the namespace when it is saved (`saveTyped`, `inNs`). */
export const typed = <T>(value: T): FieldValue<T> => ({ state: "value", value, label: "FACT" });

/** Every record of the active mode. Records of the other mode are never returned, so no total can add them. */
export const allRecs = (): TMRecord[] => visibleRecords(activeNs(), store.demo.list(), store.real.list());

/** Finds one record in the active mode only. */
export const findRec = (id: string): TMRecord | null => store[activeNs()].get(id);

/** The store a record lives in. Updates and deletes go back to the same namespace. */
export const storeOf = (r: Pick<TMRecord, "ns">) => store[r.ns];

/** A typed value, relabelled as real (FACT). Unknown states carry no label and pass through. */
export const asReal = (v: FieldValue): FieldValue => (v.state === "value" ? { ...v, label: labelFor(activeNs()) } : v);

/** Copies a record into another namespace and relabels its values to match (DEMO <-> FACT). Used for app-made records that belong to a real step. */
export function inNs(rec: TMRecord, ns: Namespace): TMRecord {
  const values: TMRecord["values"] = {};
  for (const [k, v] of Object.entries(rec.values)) values[k] = v.state === "value" ? { ...v, label: labelFor(ns) } : v;
  return { ...rec, ns, ownerId: ownerOf(ns), values };
}

/** Label to show next to a stored value: its own label, or DEMO when there is no value. */
export const valueLabel = (v: FieldValue | undefined): Label => (v && v.state === "value" ? v.label : "DEMO");

/** Saves a typed entry in the active mode (DEMO label in demo, FACT in real). Returns false (and saves nothing) in real mode without consent. */
export function saveTyped(rec: Omit<TMRecord, "ns" | "ownerId" | "schemaVersion">): boolean {
  const ns = entryNs(); if (!ns) return false;
  store[ns].put(inNs({ ...rec, ns, ownerId: ownerOf(ns), schemaVersion: 1 }, ns));
  return true;
}

/** Writes an app-made record (built as demo) into the active mode, relabelled. False when real mode has no consent. */
export function putMode(rec: TMRecord): boolean {
  const ns = entryNs(); if (!ns) return false;
  store[ns].put(inNs(rec, ns));
  return true;
}

/** Small tag on each record card: DEMO or real. Never both on one card. */
export function nsTag(ns: Namespace, lang: Locale): HTMLElement {
  return h("span", { class: `badge ns-${ns}`, "data-ns": ns }, t(ns === "real" ? "badge.real" : "badge.demo", lang));
}

/** Shown above an entry form while real mode has no consent. The form saves nothing until the user ticks on More > Data. */
export function consentPrompt(lang: Locale): HTMLElement {
  return h("div", { class: "note", role: "note", "data-consent-prompt": "1" },
    h("p", {}, t("entry.consent.need", lang)),
    h("a", { href: "#/more/data", class: "btn ghost", style: "width:auto;margin:6px 0 0;min-height:44px" }, t("entry.consent.open", lang)));
}

/** Error text on submit when consent is missing. */
export const saveBlockedText = (lang: Locale): string => t("entry.consent.saveBlocked", lang);
