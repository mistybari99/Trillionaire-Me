// M-list honesty check (owner request): every "আছে" (implemented) item must point at a real route or exported
// function, and every file/test it names must exist. "আংশিক" needs some reachable part or data; "নেই" points at nothing.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ROUTES } from "../src/app";
import { BUILD_BOXES, MODULES, buildLabel, missingBoxes } from "../src/modules/capability";
import { EVIDENCE } from "../src/modules/evidence";

const ROOT = resolve(__dirname, "..");
const exists = (rel: string) => existsSync(resolve(ROOT, rel));
const routeExists = (hash: string) => { const path = hash.replace(/^#/, ""); return ROUTES.some(([re]) => re.test(path)); };
const exportsName = (file: string, name: string) => {
  const src = readFileSync(resolve(ROOT, file), "utf8");
  return new RegExp(`export\\s+(async\\s+)?(function|const|class|let)\\s+${name}\\b`).test(src);
};

describe("build status matches evidence (computed from six boxes, never typed by hand)", () => {
  const withLabel = (l: string) => MODULES.filter((m) => buildLabel(m) === l);
  const checkNamed = (id: string, e: (typeof EVIDENCE)[string]) => {
    for (const r of e.routes) expect(routeExists(r), `${id} route ${r} is not in src/app.ts ROUTES`).toBe(true);
    for (const f of e.fns) { const [file, name] = f.split("#"); expect(exists(file!), `${id} missing file ${file}`).toBe(true); expect(exportsName(file!, name!), `${id} ${f} is not exported`).toBe(true); }
    for (const f of e.files) expect(exists(f), `${id} missing ${f}`).toBe(true);
    for (const x of e.tests) expect(exists(x), `${id} missing test ${x}`).toBe(true);
  };

  it("every module has an evidence entry and six box states", () => {
    for (const m of MODULES) {
      expect(EVIDENCE[m.id], m.id).toBeDefined();
      expect(Object.keys(m.build).sort(), m.id).toEqual([...BUILD_BOXES].sort());
    }
  });

  it("every 'complete' module points at an existing route, an exported function and a test", () => {
    expect(withLabel("complete").length).toBeGreaterThan(0);
    for (const m of withLabel("complete")) {
      const e = EVIDENCE[m.id]!;
      expect(e.routes.length, `${m.id} needs a route`).toBeGreaterThan(0);
      expect(e.fns.length, `${m.id} needs a function`).toBeGreaterThan(0);
      expect(e.tests.length, `${m.id} needs a test`).toBeGreaterThan(0);
      checkNamed(m.id, e);
    }
  });

  it("every 'partial' module names some reachable part, and every file it names exists", () => {
    for (const m of withLabel("partial")) {
      const e = EVIDENCE[m.id]!;
      expect(e.routes.length + e.fns.length + e.files.length, `${m.id} needs some evidence`).toBeGreaterThan(0);
      checkNamed(m.id, e);
    }
  });

  it("a 'not built' module has no route and no function", () => {
    for (const m of withLabel("not-built")) { const e = EVIDENCE[m.id]!; expect(e.routes.length + e.fns.length, `${m.id} should have no route or function`).toBe(0); checkNamed(m.id, e); }
  });

  it("a 'blocked' module names the owner approval it waits for (a D-number) and its ready part exists", () => {
    expect(withLabel("blocked").map((m) => m.id)).toEqual(["M23"]);
    for (const m of withLabel("blocked")) { expect(m.blockedBy, m.id).toMatch(/^D-[A-E]$/); checkNamed(m.id, EVIDENCE[m.id]!); }
  });

  it("each box claim has the evidence it needs: Output needs a route, Calculation needs an exported function", () => {
    for (const m of MODULES) {
      const e = EVIDENCE[m.id]!;
      if (m.build.output === "built") expect(e.routes.length, `${m.id} output built but no route`).toBeGreaterThan(0);
      if (m.build.calc === "built") expect(e.fns.length, `${m.id} calc built but no function`).toBeGreaterThan(0);
      if (m.build.input === "built" || m.build.output === "built") expect(e.tests.length, `${m.id} needs a test`).toBeGreaterThan(0);
    }
  });

  it("the 'missing' text is present exactly when a box is missing (and says nothing when complete)", () => {
    for (const m of MODULES) {
      const miss = missingBoxes(m);
      if (miss.length) { expect(m.missing.bn.trim().length, `${m.id} bn`).toBeGreaterThan(5); expect(m.missing.en.trim().length, `${m.id} en`).toBeGreaterThan(5); }
      else { expect(m.missing.bn, m.id).toBe(""); expect(m.missing.en, m.id).toBe(""); }
    }
  });

  it("the card never claims 'complete' while the note admits a gap", () => {
    for (const m of withLabel("complete")) expect(`${m.note.en} ${m.note.bn}`, m.id).not.toMatch(/not built|not tracked|yet\b|এখনো নেই/i);
  });

  it("build status does not depend on data: no note talks about demo data", () => {
    for (const m of MODULES) { expect(m.note.en, m.id).not.toMatch(/demo data/i); expect(m.note.bn, m.id).not.toMatch(/Demo data|ডেমো ডাটা/); }
  });
});
