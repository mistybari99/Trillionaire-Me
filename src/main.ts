import "./ui/styles.css";
import { render, renderApp } from "./app";
import { applyPrefs, initStorage, repairListNamespaces, saveMonitor } from "./ui/state";
import { updateNetBadge } from "./ui/net";
import { startPrayerAlerts } from "./ui/prayerAlerts";
import { startReminders } from "./ui/reminders";
import { ensureContentPacks } from "./library/packs";
import { initLock } from "./ui/lockUi";
import { persistIfReal } from "./ui/storageCard";
import { maybeSyncPrayerTimes, startPrayerSync } from "./ui/prayerSync";
import { installUpdater } from "./ui/updater";
import { installCrossTab } from "./ui/crossTab";
import { runAutoSnapshot } from "./ui/snapshotsUi";

// Look, language and text size are applied before anything is drawn (and before the saved records load), so the first paint already has them.
applyPrefs();

const onRoute = () => {
  renderApp(); hideSplash();
  // Content packs load the first time a topic page is opened (bundled files, no network).
  if (location.hash.startsWith("#/topic")) ensureContentPacks(() => { if (location.hash.startsWith("#/topic")) render(); });
};
/** The brand splash in index.html (pre-JS) goes away once the first screen is drawn. */
const hideSplash = () => { const el = document.getElementById("tm-splash"); if (!el) return; el.classList.add("tm-out"); setTimeout(() => el.remove(), 300); };
window.addEventListener("hashchange", onRoute);
saveMonitor.subscribe(() => onRoute());
installCrossTab(onRoute);
window.addEventListener("online", () => { updateNetBadge(); void maybeSyncPrayerTimes(); });
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") void maybeSyncPrayerTimes(); });
window.addEventListener("offline", () => updateNetBadge());
initStorage().finally(() => { repairListNamespaces(); onRoute(); startReminders(); startPrayerAlerts(); void startPrayerSync(); void runAutoSnapshot(); persistIfReal(); initLock(); });

if (import.meta.env.PROD) installUpdater();
