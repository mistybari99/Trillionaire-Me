import "./ui/styles.css";
import { render } from "./app";
import { initStorage } from "./ui/state";
import { updateNetBadge } from "./ui/net";
import { startPrayerAlerts } from "./ui/prayerAlerts";

window.addEventListener("hashchange", render);
window.addEventListener("online", () => updateNetBadge());
window.addEventListener("offline", () => updateNetBadge());
initStorage().finally(() => { render(); startPrayerAlerts(); });

if ("serviceWorker" in navigator && import.meta.env.PROD) navigator.serviceWorker.register("./sw.js").catch(() => { /* shell still works without it */ });
