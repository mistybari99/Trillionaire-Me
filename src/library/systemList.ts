// Loads every ready-system template in src/library/systems/*.json. Adding a system = dropping one JSON file here.
// A file that fails validation is left out of the list and its errors are kept for tests (same rule as content packs).
import { validateSystem, type SystemTemplate } from "../core/systems";

const files = import.meta.glob("./systems/*.json", { eager: true, import: "default" }) as Record<string, unknown>;

export interface SystemLoad { systems: SystemTemplate[]; errors: Record<string, string[]> }

/** Pure over its input so tests can feed in broken files too. File name must equal the template id. */
export function loadSystems(entries: Record<string, unknown>): SystemLoad {
  const systems: SystemTemplate[] = [];
  const errors: Record<string, string[]> = {};
  const seen = new Set<string>();
  for (const path of Object.keys(entries).sort()) {
    const base = path.replace(/^.*\//, "").replace(/\.json$/, "");
    const res = validateSystem(entries[path]);
    if (!res.ok) { errors[path] = res.errors; continue; }
    const errs: string[] = [];
    if (res.system.id !== base) errs.push(`id ${res.system.id} must match file name ${base}`);
    if (seen.has(res.system.id)) errs.push(`duplicate id ${res.system.id}`);
    if (errs.length) { errors[path] = errs; continue; }
    seen.add(res.system.id);
    systems.push(res.system);
  }
  return { systems, errors };
}

const LOADED = loadSystems(files);
export const SYSTEMS: SystemTemplate[] = LOADED.systems;
export const SYSTEM_ERRORS: Record<string, string[]> = LOADED.errors;
