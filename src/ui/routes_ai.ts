// Route added by the AI and search layer (W1). Registered in src/app.ts by one spread line.
import { aiConnectScreen } from "./aiConnectUi";
import { prefs } from "./state";

export const ROUTES_AI: Array<[RegExp, () => HTMLElement, string]> = [
  [/^\/settings\/connections\/ai$/, () => aiConnectScreen(prefs.lang), "settings"], // W1: Connect AI
];
