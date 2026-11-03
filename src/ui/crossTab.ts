// Cross-tab refresh (Settings SET-6.04). The consent tick, the PIN lock and the data mode live in this phone's localStorage.
// When another tab of the app changes one of them, this tab redraws so it never shows a stale "allowed" or "unlocked" state.
// The core already reads consent fresh on every write (fail closed), so this is only about what the screen says.
// It only redraws; it never writes anything.
import { CONSENT_KEY } from "../core/consent";
import { LOCK_KEY } from "../core/appLock";

export const WATCHED_KEYS: readonly string[] = [CONSENT_KEY, LOCK_KEY, "tm:ui:dataMode"];

/** True when a storage event touches consent, lock or data mode (key === null means the whole storage was cleared). */
export const isWatchedChange = (key: string | null): boolean => key === null || WATCHED_KEYS.includes(key);

export function installCrossTab(redraw: () => void, target: Pick<Window, "addEventListener"> = window): void {
  target.addEventListener("storage", (e) => { if (isWatchedChange((e as StorageEvent).key)) redraw(); });
}
