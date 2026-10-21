// Catalog validator: the "script report" behind TM-TST-066/092/161 (100% of fields have help + privacy + bn/en text).
import { FIELDS, CATALOG_VERSION } from "./fields";
import { entityById } from "../schema/entities";
import { LOCALES, type Bi } from "../i18n/registry";
import { PURPOSES } from "./types";

const BN_EXEMPT = /^(Asia\/Dhaka|BDT)$/;
const okText = (b: Bi | undefined, needScript = true) =>
  !!b && !!b.bn.trim() && !!b.en.trim() && (!needScript || BN_EXEMPT.test(b.bn.trim()) || LOCALES.bn.scripts.test(b.bn)) && (BN_EXEMPT.test(b.en.trim()) || /[A-Za-z0-9]/.test(b.en));

export interface CatalogReport { version: number; fields: number; withHelp: number; withPrivacy: number; withPurposeAndAccess: number; withBilingualLabel: number; withUnknownRule: number; problems: string[] }

export function validateCatalog(): CatalogReport {
  const problems: string[] = [];
  const ids = new Set<string>();
  let withHelp = 0, withPrivacy = 0, withPA = 0, withLabel = 0, withUnk = 0;
  for (const f of FIELDS) {
    if (ids.has(f.id)) problems.push(`duplicate id ${f.id}`); ids.add(f.id);
    if (!entityById(f.entity)) problems.push(`${f.id}: unknown entity ${f.entity}`);
    const h = f.help;
    if (okText(h.what) && okText(h.why) && okText(h.example) && (!h.format || okText(h.format))) withHelp++; else problems.push(`${f.id}: incomplete help`);
    if (f.privacy && f.importance && f.requirement) withPrivacy++; else problems.push(`${f.id}: no privacy/importance`);
    if ((PURPOSES as readonly string[]).includes(f.purpose) && f.access) withPA++; else problems.push(`${f.id}: no purpose/access`);
    if (okText(f.label)) withLabel++; else problems.push(`${f.id}: label`);
    // numeric fields must offer unknown states (TM-REQ-021)
    const numeric = f.type === "number" || f.type === "money" || f.type === "scale";
    if (!numeric || f.unknownStates.length === 4) withUnk++; else problems.push(`${f.id}: numeric field lacks unknown states`);
    if (f.options) for (const o of f.options) if (!okText(o.label)) problems.push(`${f.id}: option ${o.code} label`);
    if ((f.privacy === "worship" || f.privacy === "health") && f.access !== "device_only_per_item_authorisation") problems.push(`${f.id}: restricted field not per-item authorised`);
  }
  return { version: CATALOG_VERSION, fields: FIELDS.length, withHelp, withPrivacy, withPurposeAndAccess: withPA, withBilingualLabel: withLabel, withUnknownRule: withUnk, problems };
}
