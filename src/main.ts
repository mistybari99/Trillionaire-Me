import "./ui/styles.css";
import { render, renderApp } from "./app";
import { initStorage } from "./ui/state";
import { updateNetBadge } from "./ui/net";
import { startPrayerAlerts } from "./ui/prayerAlerts";
import { ensureContentPacks } from "./library/packs";
import { runAutoSnapshot } from "./ui/snapshotsUi";

const onRoute = () => {
  renderApp();
  // Content packs load the first time a topic page is opened (bundled files, no network).
  if (location.hash.startsWith("#/topic")) ensureContentPacks(() => { if (location.hash.startsWith("#/topic")) render(); });
};
window.addEventListener("hashchange", onRoute);
window.addEventListener("online", () => updateNetBadge());
window.addEventListener("offline", () => updateNetBadge());
initStorage().finally(() => { onRoute(); startPrayerAlerts(); void runAutoSnapshot(); });

if ("serviceWorker" in navigator && import.meta.env.PROD) navigator.serviceWorker.register("./sw.js").catch(() => { /* shell still works without it */ });
