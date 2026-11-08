import { h } from "./dom";
import { tb } from "../i18n/t";
import type { Locale } from "../i18n/registry";
import { helpTrigger } from "./helpUi";
import { PRESENTATION_VALUES, getPresentationPreferences, setPresentationPreference, type PresentationPreferences } from "./presentationPreferences";
const bi = (en: string, bn: string) => ({ en, bn });
export const PRESENTATION_LABELS = {
  helpPlacement: bi("Help placement", "হেল্প কোথায় দেখাবে"),
  helpVisuals: bi("Help visuals", "হেল্পের ভিজুয়াল"),
  helpContent: bi("Guide and own map", "গাইড ও নিজের ম্যাপ"),
  tabNavigation: bi("Tab navigation", "ট্যাব নেভিগেশন"),
  floatingHead: bi("Floating quick button", "ভেসে থাকা দ্রুত বাটন"),
};
const labels: Record<string, ReturnType<typeof bi>> = {
  inline: bi("Below the info button", "ইনফো বাটনের নিচে"), sheet: bi("Separate panel", "আলাদা প্যানেলে"),
  diagram: bi("Simple diagram", "সহজ ডায়াগ্রাম"), illustrated: bi("Diagram and illustration", "ডায়াগ্রাম ও ছবি"),
  guide: bi("Guide only", "শুধু গাইড"), "guide-and-mine": bi("Guide and My map tabs", "গাইড ও আমার ম্যাপ ট্যাব"),
  navigate: bi("Open page with quick tools", "পেজ খুলবে, সাথে দরকারি টুল"), menu: bi("Open quick menu first", "আগে ছোট মেনু খুলবে"),
  off: bi("Off", "বন্ধ"), on: bi("On", "চালু"),
};
let lastSaved: boolean | undefined;
if (typeof window !== "undefined") window.addEventListener("tm:presentation-changed", (event) => {
  if ((event as CustomEvent).detail?.reset) lastSaved = undefined;
});
export function presentationSettings(lang: Locale): HTMLElement {
  const current = getPresentationPreferences();
  const note = h("p", { class: "muted", role: "status", "data-presentation-save": "" });
  const update = () => { note.textContent = lastSaved === undefined ? "" : tb(lastSaved ? bi("Saved on this device.", "এই ডিভাইসে সেভ হয়েছে।") : bi("Applied for this session. Could not save on this device; choose again to retry.", "এখন ব্যবহার হবে। এই ডিভাইসে সেভ হয়নি; আবার বেছে নিয়ে চেষ্টা করুন।"), lang); };
  update();
  return h("section", { class: "card", "data-presentation-settings": "" },
    h("h2", { class: "card-h" }, tb(bi("Help and quick navigation", "হেল্প ও দ্রুত নেভিগেশন"), lang)),
    ...Object.keys(PRESENTATION_VALUES).map((raw) => {
      const key = raw as keyof PresentationPreferences;
      const select = h("select", { id: `presentation-${key}`, "data-presentation": key },
        ...PRESENTATION_VALUES[key].map((value) => h("option", { value, selected: current[key] === value }, tb(labels[value]!, lang))));
      select.addEventListener("change", () => { lastSaved = setPresentationPreference(key, select.value as PresentationPreferences[typeof key]).saved; update(); });
      return h("div", { class: "field", "data-setting-row": key.toLowerCase() }, key === "floatingHead" ? h("div", { class: "k-linkrow", style: "display:flex;align-items:center;justify-content:space-between;gap:12px" }, h("label", { for: select.id }, tb(PRESENTATION_LABELS[key], lang)), helpTrigger("head", lang)) : h("label", { for: select.id }, tb(PRESENTATION_LABELS[key], lang)), select);
    }), note);
}
