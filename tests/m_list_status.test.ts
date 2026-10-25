// M-list honesty check (owner request): every "আছে" (implemented) item must point at a real route or exported
// function, and every file/test it names must exist. "আংশিক" needs some reachable part or data; "নেই" points at nothing.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ROUTES } from "../src/app";
import { MODULES } from "../src/modules/capability";
import { EVIDENCE } from "../src/modules/evidence";

const ROOT = resolve(__dirname, "..");
const exists = (rel: string) => existsSync(resolve(ROOT, rel));
const routeExists = (hash: string) => { const path = hash.replace(/^#/, ""); return ROUTES.some(([re]) => re.test(path)); };
const exportsName = (file: string, name: string) => {
  const src = readFileSync(resolve(ROOT, file), "utf8");
  return new RegExp(`export\\s+(async\\s+)?(function|const|class|let)\\s+${name}\\b`).test(src);
};

describe("M-list status matches evidence", () => {
  it("every module has an evidence entry", () => {
    for (const m of MODULES) expect(EVIDENCE[m.id], m.id).toBeDefined();
  });

  it("every 'আছে' (implemented) item points at an existing route or exported function, plus a test file", () => {
    const built = MODULES.filter((m) => m.statuses.includes("implemented"));
    expect(built.length).toBeGreaterThan(0);
    for (const m of built) {
      const e = EVIDENCE[m.id]!;
      expect(e.routes.length + e.fns.length, `${m.id} needs a route or function`).toBeGreaterThan(0);
      for (const r of e.routes) expect(routeExists(r), `${m.id} route ${r} is not in src/app.ts ROUTES`).toBe(true);
      for (const f of e.fns) {
        const [file, name] = f.split("#");
        expect(exists(file!), `${m.id} missing file ${file}`).toBe(true);
        expect(exportsName(file!, name!), `${m.id} ${f} is not exported`).toBe(true);
      }
      expect(e.tests.length, `${m.id} needs a test`).toBeGreaterThan(0);
      for (const t of e.tests) expect(exists(t), `${m.id} missing test ${t}`).toBe(true);
    }
  });

  it("every 'আংশিক' (partial) item names at least one reachable part or data file, and every file it names exists", () => {
    for (const m of MODULES.filter((x) => x.statuses.includes("partial"))) {
      const e = EVIDENCE[m.id]!;
      expect(e.routes.length + e.fns.length + e.files.length, `${m.id} needs some evidence`).toBeGreaterThan(0);
      for (const r of e.routes) expect(routeExists(r), `${m.id} route ${r}`).toBe(true);
      for (const f of e.fns) { const [file, name] = f.split("#"); expect(exportsName(file!, name!), `${m.id} ${f}`).toBe(true); }
      for (const f of e.files) expect(exists(f), `${m.id} missing ${f}`).toBe(true);
    }
  });

  it("every 'নেই' (not built) item points at nothing", () => {
    for (const m of MODULES.filter((x) => x.statuses.includes("not-built") && !x.statuses.includes("implemented") && !x.statuses.includes("partial"))) {
      const e = EVIDENCE[m.id]!;
      expect(e.routes.length + e.fns.length + e.files.length + e.tests.length, `${m.id} should have no evidence`).toBe(0);
    }
  });

  it("the More list shows only honest labels (no 'G…-এ' promise on built items, no 'not built' on built items)", () => {
    for (const m of MODULES) {
      const built = m.statuses.includes("implemented");
      expect(built && m.statuses.includes("not-built"), m.id).toBe(false);
      expect(built && m.statuses.includes("partial"), m.id).toBe(false);
    }
  });
});
