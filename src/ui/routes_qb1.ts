// Routes added by build-queue batch 1. Registered in src/app.ts by one spread line.
import { inspirationScreen } from "./inspirationUi";
import { withView } from "./viewBar";
import { prefs, type ViewScreen } from "./state";

/** Q-05: puts the Detailed / Compact chooser (and the Look page entry) on a screen that did not have one. */
export const viewed = (screen: ViewScreen, build: () => HTMLElement): HTMLElement => withView(screen, prefs.lang, build());

export const ROUTES_QB1: Array<[RegExp, () => HTMLElement, string]> = [
  [/^\/diary\/inspiration$/, () => inspirationScreen(), "diary"],
];
