/** Per-device presentation choices; independent of records, consent and namespaces. */
export const PRESENTATION_VALUES = {
  helpPlacement: ["inline", "sheet"],
  helpVisuals: ["diagram", "illustrated"],
  helpContent: ["guide", "guide-and-mine"],
  tabNavigation: ["navigate", "menu"],
  floatingHead: ["off", "on"],
} as const;
export type PresentationPreferences = { [K in keyof typeof PRESENTATION_VALUES]: typeof PRESENTATION_VALUES[K][number] };
export const PRESENTATION_DEFAULTS: PresentationPreferences = {
  helpPlacement: "inline", helpVisuals: "diagram", helpContent: "guide", tabNavigation: "navigate", floatingHead: "off",
};
const session = new Map<keyof PresentationPreferences, string>();
const keyFor = (key: keyof PresentationPreferences) => ["tm", "ui", key].join(":");
const valid = <K extends keyof PresentationPreferences>(key: K, value: unknown): value is PresentationPreferences[K] =>
  (PRESENTATION_VALUES[key] as readonly unknown[]).includes(value);
export function getPresentationPreferences(): PresentationPreferences {
  const result = { ...PRESENTATION_DEFAULTS };
  for (const key of Object.keys(PRESENTATION_VALUES) as (keyof PresentationPreferences)[]) {
    let value: unknown = session.get(key);
    if (value === undefined) { try { value = localStorage.getItem(keyFor(key)); } catch { /* defaults when unavailable */ } }
    if (valid(key, value)) Object.assign(result, { [key]: value });
  }
  return result;
}
export function setPresentationPreference<K extends keyof PresentationPreferences>(key: K, value: PresentationPreferences[K]): { saved: boolean } {
  if (!(key in PRESENTATION_VALUES) || !valid(key, value)) throw new TypeError("Invalid presentation preference");
  let saved = true;
  try { localStorage.setItem(keyFor(key), value); session.delete(key); }
  catch { session.set(key, value); saved = false; }
  window.dispatchEvent(new CustomEvent("tm:presentation-changed", { detail: { key, value, saved } }));
  return { saved };
}
export function resetPresentationPreferences(): { saved: boolean } {
  let saved = true;
  for (const key of Object.keys(PRESENTATION_VALUES) as (keyof PresentationPreferences)[]) {
    try { localStorage.removeItem(keyFor(key)); session.delete(key); }
    catch { session.set(key, PRESENTATION_DEFAULTS[key]); saved = false; }
  }
  window.dispatchEvent(new CustomEvent("tm:presentation-changed", { detail: { reset: true, saved } }));
  return { saved };
}
