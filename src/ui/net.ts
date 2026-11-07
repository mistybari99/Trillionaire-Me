// Connection badge. Online/offline changes update this one element only: a full re-render would close open
// panels and drop text the user is typing (for example a search they are about to send).
import { t } from "../i18n/t";
import { prefs } from "./state";

export function updateNetBadge(root: ParentNode = document): void {
  const el = root.querySelector<HTMLElement>("[data-net]");
  if (!el) return;
  const online = navigator.onLine;
  el.setAttribute("data-net", online ? "online" : "offline");
  el.textContent = t(online ? "status.online" : "status.offline", prefs.lang);
}
