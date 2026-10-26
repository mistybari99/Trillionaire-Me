// Content packs: plain JSON files in public/content/. Vite bundles each file as a lazy chunk; the app loads them
// the first time a topic page is opened. No fetch, no external host, no key, no account. Adding a pack file = data only.
// A pack that fails validation is skipped and its errors are kept for tests. Tips are drafts until a reviewer signs off.
import type { Bi } from "../i18n/registry";
import { TIPS, TIP_KINDS, TIP_SOURCES, TOPICS, tipsOf, type DiagramType, type Tip, type TipKind, type TipSource } from "./topics";

export const PACK_SCHEMA = "tm-content-pack";
export const PACK_SCHEMA_VERSION = 1;

export interface ContentPack { packId: string; description: string; tips: Tip[] }
export type PackResult = { ok: true; pack: ContentPack } | { ok: false; errors: string[] };

const DIAGRAMS: readonly DiagramType[] = ["steps", "cycle", "matrix"];
const TIP_KEYS = new Set(["id", "topic", "tags", "title", "how", "diagram", "appLink", "kind", "source", "reviewer"]);
const PACK_KEYS = new Set(["schema", "schemaVersion", "packId", "reviewStatus", "license", "description", "tips"]);
const BN_SCRIPT = /[ঀ-৿]/;
const URL_LIKE = /https?:|\bwww\.|\/\/|ftp:/i;
const FILE_NAME = /^pack-[a-z0-9-]{1,30}\.json$/;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const isBi = (v: unknown): v is Bi => isObj(v) && text(v.bn) && text(v.en);
const labelsOf = (s: string) => s.split("|").map((x) => x.trim());

/** Checks one pack object against the schema. Returns every problem found (not just the first). */
export function validatePack(raw: unknown, reservedTipIds: ReadonlySet<string> = new Set(TIPS.map((t) => t.id))): PackResult {
  const errors: string[] = [];
  if (!isObj(raw)) return { ok: false, errors: ["pack is not an object"] };
  for (const k of Object.keys(raw)) if (!PACK_KEYS.has(k)) errors.push(`unknown pack key: ${k}`);
  if (raw.schema !== PACK_SCHEMA) errors.push(`schema must be ${PACK_SCHEMA}`);
  if (raw.schemaVersion !== PACK_SCHEMA_VERSION) errors.push(`schemaVersion must be ${PACK_SCHEMA_VERSION}`);
  if (typeof raw.packId !== "string" || !/^[a-z0-9-]{3,40}$/.test(raw.packId)) errors.push("packId must be 3-40 chars: a-z, 0-9, -");
  if (raw.reviewStatus !== "pending_reviewer") errors.push("reviewStatus must be pending_reviewer until a reviewer signs off");
  if (!text(raw.license)) errors.push("license is required");
  if (!text(raw.description)) errors.push("description is required");
  if (!Array.isArray(raw.tips) || raw.tips.length === 0) return { ok: false, errors: [...errors, "tips must be a non-empty array"] };

  const topicIds = new Set(TOPICS.map((t) => t.id));
  const seen = new Set<string>();
  const tips: Tip[] = [];
  raw.tips.forEach((r: unknown, i: number) => {
    const at = `tips[${i}]`;
    if (!isObj(r)) { errors.push(`${at} is not an object`); return; }
    for (const k of Object.keys(r)) if (!TIP_KEYS.has(k)) errors.push(`${at}: unknown key ${k}`);
    const id = r.id;
    if (typeof id !== "string" || !/^[a-z0-9-]{2,40}$/.test(id)) errors.push(`${at}: id must be 2-40 chars: a-z, 0-9, -`);
    else {
      if (seen.has(id) || reservedTipIds.has(id)) errors.push(`${at}: duplicate id ${id}`);
      seen.add(id);
    }
    if (typeof r.topic !== "string" || !topicIds.has(r.topic)) errors.push(`${at}: topic must be an existing topic id`);
    if (!Array.isArray(r.tags) || r.tags.length < 1 || r.tags.length > 6 || !r.tags.every((g) => typeof g === "string" && /^[a-z-]{2,20}$/.test(g))) errors.push(`${at}: tags must be 1-6 lowercase words`);
    if (!isBi(r.title)) errors.push(`${at}: title needs bn and en`);
    if (!isBi(r.how)) errors.push(`${at}: how needs bn and en`);
    else {
      if (!BN_SCRIPT.test(r.how.bn)) errors.push(`${at}: how.bn must be Bangla`);
      if (r.how.bn.length >= 260) errors.push(`${at}: how.bn is 260 characters or more`);
    }
    if (isBi(r.title) && !BN_SCRIPT.test(r.title.bn)) errors.push(`${at}: title.bn must be Bangla`);
    const d = r.diagram;
    if (!isObj(d) || typeof d.type !== "string" || !DIAGRAMS.includes(d.type as DiagramType) || !text(d.bn) || !text(d.en)) errors.push(`${at}: diagram needs type, bn and en`);
    else {
      const nb = labelsOf(d.bn).length, ne = labelsOf(d.en).length;
      if (nb !== ne) errors.push(`${at}: diagram bn and en have different label counts (${nb} vs ${ne})`);
      if (nb < 2 || nb > 4) errors.push(`${at}: diagram needs 2-4 labels`);
      if (d.type === "matrix" && nb !== 4) errors.push(`${at}: matrix diagram needs exactly 4 labels`);
    }
    if (r.appLink !== undefined && (typeof r.appLink !== "string" || !/^#\/[a-z0-9/-]*$/.test(r.appLink))) errors.push(`${at}: appLink must be an in-app route like #/diary/money`);
    if (r.kind !== undefined && !TIP_KINDS.includes(r.kind as TipKind)) errors.push(`${at}: kind must be one of ${TIP_KINDS.join(", ")}`);
    if (r.source !== undefined && !TIP_SOURCES.includes(r.source as TipSource)) errors.push(`${at}: source must be one of ${TIP_SOURCES.join(", ")}`);
    if (r.source !== undefined && r.kind !== "learn") errors.push(`${at}: source is only for kind learn`);
    if (r.reviewer !== undefined && r.reviewer !== "pending") errors.push(`${at}: reviewer must be pending until a reviewer signs off`);
    if (JSON.stringify(r).match(URL_LIKE)) errors.push(`${at}: external address or URL-like text is not allowed`);
    if (errors.some((e) => e.startsWith(at))) return;
    tips.push({
      id: r.id as string, topic: r.topic as string, tags: r.tags as string[], title: r.title as Bi, how: r.how as Bi,
      diagram: { type: (d as Obj).type as DiagramType, bn: ((d as Obj).bn as string), en: ((d as Obj).en as string) },
      appLink: r.appLink as string | undefined,
      ...(r.kind ? { kind: r.kind as TipKind } : {}), ...(r.source ? { source: r.source as TipSource } : {}), ...(r.reviewer ? { reviewer: "pending" as const } : {}),
    });
  });
  if (URL_LIKE.test(JSON.stringify(raw))) errors.push("pack contains an external address or URL-like text");
  if (errors.length) return { ok: false, errors };
  return { ok: true, pack: { packId: raw.packId as string, description: raw.description as string, tips } };
}

export interface PackLoad { tips: Tip[]; errors: string[] }
export type PackFiles = Record<string, () => Promise<unknown>>;
/** Every JSON file in public/content/, as a lazy loader. Vite turns each into its own chunk, loaded only when asked. */
export const PACK_FILES: PackFiles = import.meta.glob("../../public/content/*.json", { import: "default" });

/** Loads every pack file. Never throws: a broken file becomes an error entry and the rest still load. */
export async function loadContentPacks(files: PackFiles = PACK_FILES): Promise<PackLoad> {
  const errors: string[] = [];
  const tips: Tip[] = [];
  const reserved = new Set(TIPS.map((t) => t.id));
  for (const path of Object.keys(files).sort()) {
    const name = path.split("/").pop() ?? path;
    if (!FILE_NAME.test(name)) { errors.push(`${name}: bad file name`); continue; }
    try {
      const res = validatePack(await files[path]!(), reserved);
      if (!res.ok) { errors.push(...res.errors.map((e) => `${name}: ${e}`)); continue; }
      for (const t of res.pack.tips) { reserved.add(t.id); tips.push(t); }
    } catch (e) {
      errors.push(`${name}: ${(e as Error).message}`);
    }
  }
  return { tips, errors };
}

// ---- app side: one shared load, started on demand ----
let loaded: PackLoad | null = null;
let inflight: Promise<PackLoad> | null = null;

/** Starts the load the first time it is asked for; calls `onLoaded` when it finishes. Never throws. */
export function ensureContentPacks(onLoaded?: () => void, files: PackFiles = PACK_FILES): void {
  if (!loaded && !inflight) {
    inflight = loadContentPacks(files).then((r) => { loaded = r; return r; }, () => { loaded = { tips: [], errors: ["load failed"] }; return loaded; });
  }
  if (onLoaded) (inflight ?? Promise.resolve(loaded!)).then(() => onLoaded());
}

/** Pack tips for a topic. Empty until the packs have loaded (or if they are missing). */
export const packTipsOf = (topic: string): Tip[] => (loaded ? loaded.tips.filter((t) => t.topic === topic) : []);
/** Bundled tips plus pack tips for one topic, in that order. */
export const tipsFor = (topic: string): Tip[] => [...tipsOf(topic), ...packTipsOf(topic)];
export const packLoadErrors = (): string[] => loaded?.errors ?? [];
/** Test hook: forget the shared state so a test can load again. */
export function resetContentPacksForTest(): void { loaded = null; inflight = null; }
