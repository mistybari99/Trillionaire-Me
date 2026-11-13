// Routes added by the Live Calculator / What-if (LIVECALC-01). Registered in src/app.ts by one spread line.
import { whatifScreen } from "./whatifUi";
import { prefs } from "./state";

export const ROUTES_WHATIF: Array<[RegExp, (m: RegExpMatchArray) => HTMLElement, string]> = [
  [/^\/whatif$/, () => whatifScreen(prefs.lang), "today"],
  [/^\/whatif\/([\w-]+)$/, (m) => whatifScreen(prefs.lang, m[1]), "today"],
];
