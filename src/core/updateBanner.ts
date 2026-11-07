// App update flow (owner request 3 Nov 2026): the phone kept an old copy after many deploys. Rules, pure:
//  - A new version waits in the background; the person is told calmly and decides. Nothing reloads by itself, so nothing typed is lost.
//  - "Update now" asks once more when a text field on the page has typed text; the second tap goes ahead.
//  - Local data (records, settings, snapshots) lives in the phone's storage, not in the app copy, so an update never touches it.
export type UpdatePhase = "idle" | "ready" | "confirm" | "updating";
export type UpdateEvent = "waiting" | "tap" | "confirmed" | "none";

/** `typed` = a text field on the page holds typed text. A first tap on Update then asks to save first. */
export function nextPhase(phase: UpdatePhase, ev: UpdateEvent, typed: boolean): UpdatePhase {
  if (ev === "waiting") return phase === "idle" ? "ready" : phase;
  if (ev === "tap") { if (phase === "ready") return typed ? "confirm" : "updating"; if (phase === "confirm") return "updating"; return phase; }
  if (ev === "confirmed") return phase === "confirm" ? "updating" : phase;
  return phase;
}

/** True when any text-like field in `root` has typed text (password fields count). Buttons, checkboxes and empty fields do not. */
export function hasTypedText(root: ParentNode): boolean {
  for (const e of root.querySelectorAll("input, textarea")) {
    const el = e as HTMLInputElement;
    if (["button", "submit", "checkbox", "radio", "range", "file", "hidden", "color"].includes(el.type)) continue;
    if (el.value.trim() !== "") return true;
  }
  return false;
}

export interface BuildInfo { version: string; sha: string; date: string }
/** "0.1.0-g1 · build ece202d · 3 Nov 2026" for the About page. Unknown parts are said plainly, never faked. */
export function stampLine(b: BuildInfo, months: readonly string[]): string {
  const d = /^(\d{4})-(\d{2})-(\d{2})/.exec(b.date);
  const date = d ? `${Number(d[3])} ${months[Number(d[2]) - 1] ?? d[2]} ${d[1]}` : "unknown date";
  return `${b.version || "unknown"} · build ${b.sha && b.sha !== "dev" ? b.sha : "unknown"} · ${date}`;
}
