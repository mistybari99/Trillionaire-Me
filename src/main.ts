import "./ui/styles.css";
import { render } from "./app";
import { initStorage } from "./ui/state";
import { startPrayerAlerts } from "./ui/prayerAlerts";

window.addEventListener("hashchange", render);
window.addEventListener("online", render);
window.addEventListener("offline", render);
initStorage().finally(() => { render(); startPrayerAlerts(); });

if ("serviceWorker" in navigator && import.meta.env.PROD) navigator.serviceWorker.register("./sw.js").catch(() => { /* shell still works without it */ });
