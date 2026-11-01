// The lazy chunks of the app. Add a screen module here, then route to it with `viaLazy` in app.ts.
import { lazy } from "./lazy";

export const PLAN = lazy("plan", () => import("./planScreens"));
export const CONN = lazy("connections", () => import("./connectionsUi"));
export const DECIDE = lazy("decide", () => import("./decisionUi"));
export const LEGS = lazy("legs", () => import("./legsUi"));
