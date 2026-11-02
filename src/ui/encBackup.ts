// More > Data: encrypted backup card (build step 4). Passphrase lives only in the input fields; it is never stored or logged.
import { h } from "./dom";
import { t } from "../i18n/t";
import type { Locale } from "../i18n/registry";
import { store } from "./state";
import { num } from "./components";
import { StoreRepo } from "../adapters/storeRepo";
import { createBackup } from "../core/backup";
import { startRestore } from "./restoreUi";
import { DecryptError, PassphraseError, decryptBackup, encryptBackup, passphraseProblem, type BackupBundle } from "../core/cryptoBackup";

export function encBackupCard(lang: Locale): HTMLElement {
  const pass = h("input", { id: "enc-pass", type: "password", autocomplete: "new-password", "data-enc": "pass" }) as HTMLInputElement;
  const pass2 = h("input", { id: "enc-pass2", type: "password", autocomplete: "new-password", "data-enc": "pass2" }) as HTMLInputElement;
  const rpass = h("input", { id: "enc-rpass", type: "password", autocomplete: "current-password", "data-enc": "rpass" }) as HTMLInputElement;
  const file = h("input", { id: "enc-file", type: "file", accept: "application/json,.json", "data-enc": "file" }) as HTMLInputElement;
  const msg = h("p", { id: "enc-msg", role: "status", "data-enc": "msg" });
  const confirmBox = h("div", { "data-enc": "confirm" });
  const say = (text: string, bad: boolean) => { msg.className = bad ? "err" : "ok-msg"; msg.textContent = text; };
  const problemText = (p: string) => t(p === "empty" ? "enc.empty" : "enc.short", lang);
  let pending: BackupBundle | null = null;

  const save = async () => {
    confirmBox.replaceChildren(); pending = null;
    const pr = passphraseProblem(pass.value); if (pr) return say(problemText(pr), true);
    if (pass.value !== pass2.value) return say(t("enc.mismatch", lang), true);
    try {
      const repo = new StoreRepo(store);
      const demo = await createBackup(repo, "demo"); const real = await createBackup(repo, "real");
      const env = await encryptBackup({ demo, real: real.count ? real : null }, pass.value);
      const a = h("a", { href: URL.createObjectURL(new Blob([JSON.stringify(env)], { type: "application/json" })), download: `tm-encrypted-backup-${demo.createdAt.slice(0, 10)}.json` });
      document.body.append(a); a.click(); a.remove();
      pass.value = ""; pass2.value = "";
      say(t("enc.saved", lang, { d: num(demo.count, lang), r: num(real.count, lang) }), false);
    } catch (e) { say(e instanceof PassphraseError ? t("enc.short", lang) : t("enc.damaged", lang), true); }
  };

  const open = async () => {
    confirmBox.replaceChildren(); pending = null;
    const f = file.files?.[0]; if (!f) return say(t("enc.nofile", lang), true);
    const pr = passphraseProblem(rpass.value); if (pr) return say(problemText(pr), true);
    try { pending = await decryptBackup(await f.text(), rpass.value); }
    catch (e) { return say(e instanceof DecryptError && /Wrong passphrase/.test(e.message) ? t("enc.wrong", lang) : t("enc.damaged", lang), true); }
    const b = pending;
    say(t("enc.found", lang, { d: num(b.demo.count, lang), r: num(b.real?.count ?? 0, lang) }), false);
    void startRestore("enc", { demo: b.demo, real: b.real, createdAt: b.demo.createdAt }, lang, () => { pending = null; rpass.value = ""; msg.textContent = ""; });
  };

  return h("div", { class: "card", "data-card": "enc-backup" }, h("h2", { class: "card-h" }, t("enc.title", lang)), h("p", { class: "muted" }, t("enc.note", lang)),
    h("label", { for: "enc-pass" }, t("enc.pass", lang)), pass,
    h("label", { for: "enc-pass2" }, t("enc.pass2", lang)), pass2,
    h("button", { class: "btn", type: "button", "data-act": "enc-save", onclick: () => save() }, t("enc.save", lang)),
    h("p", { class: "muted", "data-enc": "contains" }, t("enc.contains", lang)),
    h("h3", {}, t("enc.restore", lang)),
    h("label", { for: "enc-file" }, t("enc.file", lang)), file,
    h("label", { for: "enc-rpass" }, t("enc.pass", lang)), rpass,
    h("button", { class: "btn ghost", type: "button", "data-act": "enc-open", onclick: () => open() }, t("enc.check", lang)),
    confirmBox, msg);
}
