// Settings > Privacy > "Encrypt real data" card, the unlock screen, and the plain-export note (at-rest encryption, src/core/dataVault.ts).
// States: Off, Turning on (progress), On, Locked (the unlock screen), Turn off. Passphrases live only in input fields and in the wizard's memory until it ends; they are never stored or logged.
import { h } from "./dom";
import { t } from "../i18n/t";
import type { Key } from "../i18n/packs";
import type { Locale } from "../i18n/registry";
import { consentKv, flushStorage, closeVault, openVault, prefs, rawSnapshotRepo, snapshotRepo, store, vault, vaultRepo } from "./state";
import { num } from "./components";
import { helpTrigger } from "./helpUi";
import { markUnlocked } from "./lockUi";
import { StoreRepo } from "../adapters/storeRepo";
import { createBackup } from "../core/backup";
import { DecryptError, decryptBackup, encryptBackup } from "../core/cryptoBackup";
import { takeSnapshot } from "../core/snapshots";
import { VAULT_KEY, activateInPlace, deactivateInPlace, finishDeactivate, newVault, openSnapshots, readVault, recoverWithoutKey, sealSnapshots, tryExclusive,
  vaultPassphraseProblem, verifyVaultPassphrase, writeVault } from "../core/dataVault";

const rerender = (): void => { window.dispatchEvent(new HashChangeEvent("hashchange")); };
export const isVaultLocked = (): boolean => vault.locked();

type Step = "idle" | "warn" | "keys" | "saved" | "off";
let step: Step = "idle";
let busy: { kind: "on" | "off"; done: number; total: number } | null = null;
let note: { key: Key; bad: boolean; args?: Record<string, string | number> } | null = null;
let recFile = "";
let secrets = { pass: "", rec: "" };
let live: { bar: HTMLProgressElement; text: HTMLElement } | null = null;
let forgotOpen = false;

const problemKey = (p: "empty" | "short" | "digits"): Key => (p === "empty" ? "vault.err.empty" : p === "short" ? "vault.err.short" : "vault.err.digits");
const clearSecrets = () => { secrets = { pass: "", rec: "" }; };
const field = (id: string, label: Key, lang: Locale, auto = "new-password") => ({ el: h("input", { id, type: "password", autocomplete: auto, "data-vault": id }) as HTMLInputElement, lab: h("label", { for: id }, t(label, lang)) });
const tickRow = (id: string, text: string) => { const el = h("input", { type: "checkbox", id, "data-vault": id }) as HTMLInputElement; return { el, row: h("label", { for: id, class: "k-check" }, el, " ", text) }; };
const download = (name: string, text: string) => {
  const a = h("a", { href: URL.createObjectURL(new Blob([text], { type: "application/json" })), download: name });
  document.body.append(a); a.click(); a.remove();
};

function showProgress(lang: Locale, kind: "on" | "off"): void {
  if (!busy || !live) return;
  live.bar.max = Math.max(1, busy.total); live.bar.value = busy.done;
  live.text.textContent = t(kind === "on" ? "vault.progress" : "vault.progress.off", lang, { done: num(busy.done, lang), total: num(busy.total, lang) });
}

/** One status line for tests and the card header. */
export function vaultStatus(): "off" | "turning" | "on" | "locked" | "turningoff" {
  const c = readVault(consentKv); if (!c) return "off";
  if (vault.locked()) return "locked";
  return c.state === "on" ? "on" : c.state === "disabling" ? "turningoff" : "turning";
}

// ---- turn on ----
async function turnOn(lang: Locale): Promise<void> {
  if (!vaultRepo || !snapshotRepo || !rawSnapshotRepo) { note = { key: "vault.err.nostore", bad: true }; return rerender(); }
  busy = { kind: "on", done: 0, total: store.real.list().length }; note = null; rerender();
  const ranHere = await tryExclusive("tm-vault-run", async () => {
    try {
      await flushStorage(); // memory and storage agree before anything is sealed
      const { config, key } = await newVault(secrets.pass);
      writeVault(consentKv, config); vault.setKey(key);
      // The safety copy before encryption: sealed with the new data key (the snapshot store seals real parts), then opened again as a test.
      try {
        const snap = await takeSnapshot(new StoreRepo(store), snapshotRepo!, { reason: "before_migrate", keep: 10, realOk: true });
        const real = store.real.list().length;
        if (real > 0) {
          const raw = (await rawSnapshotRepo!.list()).find((s) => s.id === snap?.id) as (typeof snap & { realEnc?: unknown }) | undefined;
          const back = (await snapshotRepo!.list()).find((s) => s.id === snap?.id);
          if (!snap || !raw || raw.real !== null || !raw.realEnc || back?.real?.count !== real) throw new Error("before copy not verified");
        }
      } catch { vault.lock(); consentKv.remove(VAULT_KEY); throw new Error("before"); }
      await activateInPlace(vaultRepo!, key, consentKv, { afterBatch: (done, total) => { if (busy) { busy.done = done; busy.total = total; showProgress(lang, "on"); } } });
      await sealSnapshots(rawSnapshotRepo!, key);
      note = { key: "vault.done", bad: false };
    } catch (e) {
      note = { key: (e as Error).message === "before" ? "vault.err.beforefail" : "vault.err.failed", bad: true };
    }
  });
  if (!ranHere) note = { key: "vault.err.busy", bad: true };
  busy = null; clearSecrets(); step = "idle"; rerender();
}

async function resume(lang: Locale): Promise<void> {
  const key = vault.key(); if (!key || !vaultRepo || !rawSnapshotRepo) return;
  busy = { kind: "on", done: readVault(consentKv)?.done ?? 0, total: readVault(consentKv)?.total ?? 0 }; note = null; rerender();
  const ran = await tryExclusive("tm-vault-run", async () => {
    try {
      await flushStorage();
      await activateInPlace(vaultRepo!, key, consentKv, { afterBatch: (done, total) => { if (busy) { busy.done = done; busy.total = total; showProgress(lang, "on"); } } });
      await sealSnapshots(rawSnapshotRepo!, key); note = { key: "vault.done", bad: false };
    } catch { note = { key: "vault.err.failed", bad: true }; }
  });
  if (!ran) note = { key: "vault.err.busy", bad: true };
  busy = null; rerender();
}

// ---- turn off ----
async function turnOff(pass: string, lang: Locale): Promise<void> {
  if (!vaultRepo || !rawSnapshotRepo) return;
  const v = await verifyVaultPassphrase(consentKv, pass, Date.now());
  if (!v.ok) { note = v.reason === "wait" ? { key: "vault.unlock.wait", bad: true, args: { s: v.waitSeconds ?? 30 } } : { key: v.reason === "format" ? "vault.unlock.format" : "vault.unlock.wrong", bad: true }; return rerender(); }
  vault.setKey(v.key); busy = { kind: "off", done: 0, total: readVault(consentKv)?.total ?? 0 }; note = null; rerender();
  const ran = await tryExclusive("tm-vault-run", async () => {
    try {
      await flushStorage();
      await deactivateInPlace(vaultRepo!, v.key, consentKv, { keepConfig: true, afterBatch: (done, total) => { if (busy) { busy.done = done; busy.total = total; showProgress(lang, "off"); } } });
      await openSnapshots(rawSnapshotRepo!, v.key); await finishDeactivate(vaultRepo!, consentKv); vault.lock();
      note = { key: "vault.done.off", bad: false };
    } catch { note = { key: "vault.err.failed", bad: true }; }
  });
  if (!ran) note = { key: "vault.err.busy", bad: true };
  busy = null; step = "idle"; rerender();
}

// ---- the card ----
export function vaultCard(lang: Locale): HTMLElement {
  const head = (state: ReturnType<typeof vaultStatus>) => h("div", { class: "k-linkrow" }, h("h2", { class: "card-h" }, t("vault.title", lang)), helpTrigger("backup", lang),
    h("span", { class: "tag k-chip", "data-vault": "state" }, t(`vault.state.${state}` as Key, lang)));
  const msg = h("p", { role: "status", "data-vault": "msg" });
  const say = (key: Key, bad: boolean, args?: Record<string, string | number>) => { msg.className = bad ? "err" : "ok-msg"; msg.textContent = t(key, lang, args); };
  if (note) { say(note.key, note.bad, note.args); if (!busy) note = null; }
  const card = (state: ReturnType<typeof vaultStatus>, ...kids: Array<HTMLElement | null>) => h("div", { class: "card", "data-card": "vault", "data-vault-state": state }, head(state), ...kids, msg);

  if (!vaultRepo) return card("off", h("p", { class: "muted", "data-vault": "unavailable" }, t("vault.unavailable", lang)));
  const state = vaultStatus();

  if (busy) {
    const bar = h("progress", { max: String(Math.max(1, busy.total)), value: String(busy.done), "aria-label": t(busy.kind === "on" ? "vault.state.turning" : "vault.state.turningoff", lang), "data-vault": "progress" }) as HTMLProgressElement;
    const text = h("p", { role: "status", "data-vault": "progress-text" }, "");
    live = { bar, text }; showProgress(lang, busy.kind);
    return card(busy.kind === "on" ? "turning" : "turningoff", bar, text);
  }

  if (state === "off") {
    if (step === "idle") return card("off", h("p", {}, t("vault.off.p", lang)), h("button", { class: "btn", type: "button", "data-act": "vault-start", onclick: () => { step = "warn"; note = null; rerender(); } }, t("vault.start", lang)));
    if (step === "warn") {
      const tick = tickRow("vault-tick1", t("vault.warn.tick", lang));
      return card("off", h("h3", {}, t("vault.warn.title", lang)), h("p", { class: "need k-notice", "data-vault": "warning" }, t("vault.warn", lang)), tick.row,
        h("button", { class: "btn", type: "button", "data-act": "vault-next", onclick: () => { if (!tick.el.checked) return say("vault.err.tick", true); step = "keys"; rerender(); } }, t("vault.next", lang)),
        h("button", { class: "btn ghost", type: "button", "data-act": "vault-cancel", onclick: () => { step = "idle"; clearSecrets(); rerender(); } }, t("vault.cancel", lang)));
    }
    if (step === "keys") {
      const p1 = field("vault-pass", "vault.pass", lang), p2 = field("vault-pass2", "vault.pass2", lang), r1 = field("vault-rec", "vault.rec.pass", lang), r2 = field("vault-rec2", "vault.rec.pass2", lang);
      const save = async () => {
        for (const x of [p1.el.value, r1.el.value]) { const pr = vaultPassphraseProblem(x); if (pr) return say(problemKey(pr), true); }
        if (p1.el.value !== p2.el.value || r1.el.value !== r2.el.value) return say("vault.err.mismatch", true);
        if (p1.el.value === r1.el.value) return say("vault.err.same", true);
        try {
          const repo = new StoreRepo(store); const demo = await createBackup(repo, "demo"); const real = await createBackup(repo, "real");
          const env = await encryptBackup({ demo, real: real.count ? real : null }, r1.el.value); const text = JSON.stringify(env);
          const check = await decryptBackup(text, r1.el.value); // test decrypt: the file really opens with that passphrase
          if (check.demo.count !== demo.count || (check.real?.count ?? 0) !== real.count) throw new Error("count");
          recFile = `tm-recovery-${demo.createdAt.slice(0, 10)}.json`; download(recFile, text);
          secrets = { pass: p1.el.value, rec: r1.el.value }; step = "saved"; note = { key: "vault.rec.saved", bad: false, args: { r: num(real.count, lang), d: num(demo.count, lang), f: recFile } }; rerender();
        } catch { say("vault.err.recfail", true); }
      };
      return card("off", h("h3", {}, t("vault.keys.title", lang)), h("p", { class: "muted" }, t("vault.rec.p", lang)), p1.lab, p1.el, p2.lab, p2.el, r1.lab, r1.el, r2.lab, r2.el,
        h("button", { class: "btn", type: "button", "data-act": "vault-save-recovery", onclick: () => void save() }, t("vault.rec.save", lang)),
        h("button", { class: "btn ghost", type: "button", "data-act": "vault-cancel", onclick: () => { step = "idle"; clearSecrets(); rerender(); } }, t("vault.cancel", lang)));
    }
    if (step === "saved") {
      const tick = tickRow("vault-tick2", t("vault.rec.tick", lang));
      return card("off", tick.row, h("button", { class: "btn", type: "button", "data-act": "vault-go", onclick: () => { if (!tick.el.checked) return say("vault.err.tick", true); void turnOn(lang); } }, t("vault.go", lang)),
        h("button", { class: "btn ghost", type: "button", "data-act": "vault-cancel", onclick: () => { step = "idle"; clearSecrets(); note = null; rerender(); } }, t("vault.cancel", lang)));
    }
  }

  const opened = vault.opaqueCount ? h("p", { class: "muted", "data-vault": "cant" }, t("vault.cant", lang, { n: num(vault.opaqueCount, lang) })) : null;
  const offForm = (): HTMLElement => {
    const p = field("vault-off-pass", "vault.unlock.label", lang, "current-password");
    return h("div", { "data-vault": "off-form" }, h("p", { class: "muted" }, t("vault.off.p2", lang)), p.lab, p.el,
      h("button", { class: "btn ghost", type: "button", "data-act": "vault-off-go", onclick: () => void turnOff(p.el.value, lang) }, t("vault.off.go", lang)));
  };
  if (state === "turning" || state === "turningoff") {
    return card(state, h("p", { "data-vault": "resume" }, t("vault.resume.p", lang)),
      state === "turning" ? h("button", { class: "btn", type: "button", "data-act": "vault-resume", onclick: () => void resume(lang) }, t("vault.resume", lang)) : null,
      step === "off" || state === "turningoff" ? offForm() : h("button", { class: "btn ghost", type: "button", "data-act": "vault-off", onclick: () => { step = "off"; rerender(); } }, t("vault.off.btn", lang)), opened);
  }
  return card("on", h("p", {}, t("vault.on.p", lang)), h("p", { class: "muted" }, t("vault.on.n", lang, { n: num(store.real.list().length, lang) })), opened,
    h("button", { class: "btn", type: "button", "data-act": "vault-lock", onclick: () => { closeVault(); rerender(); } }, t("vault.lock.now", lang)),
    step === "off" ? offForm() : h("button", { class: "btn ghost", type: "button", "data-act": "vault-off", onclick: () => { step = "off"; rerender(); } }, t("vault.off.btn", lang)));
}

/** A plain-file warning shown next to every export that writes readable data. Null while the vault is off. */
export function plainExportNote(lang: Locale): HTMLElement | null {
  return readVault(consentKv) ? h("p", { class: "muted", "data-vault": "plain-note" }, t("vault.plain.note", lang)) : null;
}

// ---- the unlock screen ----
export function vaultUnlockScreen(): HTMLElement {
  const lang = prefs.lang;
  const pass = h("input", { id: "vault-unlock-pass", type: "password", autocomplete: "current-password", "data-vault": "unlock-pass", "aria-describedby": "vault-unlock-msg" }) as HTMLInputElement;
  const msg = h("p", { id: "vault-unlock-msg", role: "alert", "data-vault": "unlock-msg" });
  const go = async (e?: Event) => {
    e?.preventDefault(); msg.textContent = t("vault.unlock.busy", lang);
    const r = await verifyVaultPassphrase(consentKv, pass.value, Date.now());
    if (r.ok) { await openVault(r.key); markUnlocked(); rerender(); return; }
    pass.value = "";
    msg.textContent = r.reason === "wait" ? t("vault.unlock.wait", lang, { s: r.waitSeconds ?? 30 }) : r.reason === "format" ? t("vault.unlock.format", lang) : t("vault.unlock.wrong", lang);
  };
  return h("main", { "data-vault-screen": "1" }, h("h1", {}, t("vault.unlock.title", lang)), h("p", {}, t("vault.unlock.p", lang)),
    h("form", { onsubmit: (e: Event) => void go(e) }, h("label", { for: "vault-unlock-pass" }, t("vault.unlock.label", lang)), pass,
      h("button", { class: "btn", type: "submit", "data-act": "vault-unlock" }, t("vault.unlock.btn", lang)), msg),
    h("button", { class: "btn ghost", type: "button", "data-act": "vault-forgot", onclick: () => { forgotOpen = !forgotOpen; rerender(); } }, t("vault.forgot", lang)),
    forgotOpen ? forgotPanel(lang) : null);
}

function forgotPanel(lang: Locale): HTMLElement {
  const file = h("input", { id: "vault-rf", type: "file", accept: "application/json,.json", "data-vault": "rf" }) as HTMLInputElement;
  const p = field("vault-rfp", "vault.forgot.pass", lang, "current-password");
  const msg = h("p", { role: "status", "data-vault": "forgot-msg" });
  const box = h("div", { "data-vault": "forgot-confirm" });
  const say = (key: Key, bad: boolean, args?: Record<string, string | number>) => { msg.className = bad ? "err" : "ok-msg"; msg.textContent = t(key, lang, args); };
  const check = async () => {
    box.replaceChildren(); const f = file.files?.[0]; if (!f) return say("vault.forgot.nofile", true);
    let bundle; try { bundle = await decryptBackup(await f.text(), p.el.value); } catch (e) { return say(e instanceof DecryptError || e instanceof Error ? "vault.forgot.wrong" : "vault.forgot.wrong", true); }
    const real = bundle.real?.records ?? []; say("vault.forgot.found", false, { r: num(real.length, lang) });
    const tick = tickRow("vault-forgot-tick", t("vault.forgot.tick", lang));
    box.append(tick.row, h("button", { class: "btn", type: "button", "data-act": "vault-forgot-go", onclick: async () => {
      if (!tick.el.checked) return say("vault.err.tick", true);
      if (!vaultRepo) return say("vault.err.nostore", true);
      try { await recoverWithoutKey(vaultRepo, consentKv, real); say("vault.forgot.done", false); closeVault(); setTimeout(() => location.reload(), 600); } catch { say("vault.err.failed", true); }
    } }, t("vault.forgot.go", lang)));
  };
  return h("div", { class: "card", "data-vault": "forgot" }, h("p", {}, t("vault.forgot.p", lang)), h("label", { for: "vault-rf" }, t("vault.forgot.file", lang)), file, p.lab, p.el,
    h("button", { class: "btn ghost", type: "button", "data-act": "vault-forgot-check", onclick: () => void check() }, t("vault.forgot.check", lang)), box, msg);
}
