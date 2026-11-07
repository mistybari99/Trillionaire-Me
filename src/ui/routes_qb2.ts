// Routes added by build-queue batch 2. Registered in src/app.ts by one spread line.
import { planTableScreen } from "./qb2Ui";

export const ROUTES_QB2: Array<[RegExp, (m: RegExpMatchArray) => HTMLElement, string]> = [
  [/^\/journey\/goal\/([\w-]+)\/table$/, (m) => planTableScreen(m[1]!), "journey"], // Q-11
];
