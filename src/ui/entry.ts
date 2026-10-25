// Entry forms (D-B, owner approved 25 Oct 2026). A typed record is saved as REAL only after the consent tick
// (More > Demo & real data). Without the tick the form shows the prompt and saves nothing.
// Reads go to both namespaces; every record keeps its own ns and label, so DEMO and real stay distinct.
import { h } from "./dom";
import { t } from "../i18n/t";
import type { Locale } from "../i18n/registry";
import { readConsent } from "../core/consent";
import type { FieldValue, Label, Namespace, TMRecord } from "../core/types";
import { consentKv, store } from "./state";

/** Owner id on real records. Demo records keep "demo-user". */
export const REAL_OWNER = "owner";
export const ownerOf = (ns: Namespace): string => (ns === "real" ? REAL_OWNER : "demo-user");

export const consentOn = (): boolean => readConsent(consentKv);

/** Namespace a new entry is written to: real after consent, otherwise nothing (null). */
export const entryNs = (): Namespace | null => (consentOn() ? "real" : null);

/** Label for values the app writes into a namespace. Demo values are DEMO; real values the user typed are FACT. */
export const labelFor = (ns: Namespace): Label => (ns === "real" ? "FACT" : "DEMO");

/** A value the user typed into a real entry. */
export const typed = <T>(value: T): FieldValue<T> => ({ state: "value", value, label: "FACT" });

/** Every record, demo and real together. Callers read `r.ns` / the label to tell them apart. */
export const allRecs = (): TMRecord[] => [...store.demo.list(), ...store.real.list()];

/** Finds one record in either namespace (real first). */
export const findRec = (id: string): TMRecord | null => store.real.get(id) ?? store.demo.get(id);

/** The store a record lives in. Updates and deletes go back to the same namespace. */
export const storeOf = (r: Pick<TMRecord, "ns">) => store[r.ns];

/** A typed value, relabelled as real (FACT). Unknown states carry no label and pass through. */
export const asReal = (v: FieldValue): FieldValue => (v.state === "value" ? { ...v, label: "FACT" } : v);

/** Copies a record into another namespace and relabels its values to match (DEMO <-> FACT). Used for app-made records that belong to a real step. */
export function inNs(rec: TMRecord, ns: Namespace): TMRecord {
  const values: TMRecord["values"] = {};
  for (const [k, v] of Object.entries(rec.values)) values[k] = v.state === "value" ? { ...v, label: labelFor(ns) } : v;
  return { ...rec, ns, ownerId: ownerOf(ns), values };
}

/** Label to show next to a stored value: its own label, or DEMO when there is no value. */
export const valueLabel = (v: FieldValue | undefined): Label => (v && v.state === "value" ? v.label : "DEMO");

/** Saves a typed entry as a real record. Returns false (and saves nothing) without consent. */
export function saveTyped(rec: Omit<TMRecord, "ns" | "ownerId" | "schemaVersion">): boolean {
  if (!consentOn()) return false;
  store.real.put({ ...rec, ns: "real", ownerId: ownerOf("real"), schemaVersion: 1 });
  return true;
}

/** Small tag on each record card: DEMO or real. Never both on one card. */
export function nsTag(ns: Namespace, lang: Locale): HTMLElement {
  return h("span", { class: `badge ns-${ns}`, "data-ns": ns }, t(ns === "real" ? "badge.real" : "badge.demo", lang));
}

/** Shown above an entry form while there is no consent. The form saves nothing until the user ticks on More > Data. */
export function consentPrompt(lang: Locale): HTMLElement {
  return h("div", { class: "note", role: "note", "data-consent-prompt": "1" },
    h("p", {}, t("entry.consent.need", lang)),
    h("a", { href: "#/more/data", class: "btn ghost", style: "width:auto;margin:6px 0 0;min-height:44px" }, t("entry.consent.open", lang)));
}

/** Error text on submit when consent is missing. */
export const saveBlockedText = (lang: Locale): string => t("entry.consent.saveBlocked", lang);
