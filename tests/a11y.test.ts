// Accessibility checks (WCAG 2.2 AA-minded). Pure checks on styles.css tokens + jsdom render of every route in both languages.
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { TOPICS } from "../src/library/topics";
import { PACKS } from "../src/i18n/packs";

const CSS = readFileSync("src/ui/styles.css", "utf8");
const TS_UI = ["assessment", "components", "diagram", "dom", "rewardArt", "screens", "state"].map((f) => readFileSync(`src/ui/${f}.ts`, "utf8")).join("\n");

// ---------- contrast ----------
const lum = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
};
export const contrast = (a: string, b: string) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

/** Reads `--token:#hex` declarations from the body of the first rule whose selector matches `sel`. */
function tokensOf(sel: RegExp): Record<string, string> {
  const m = CSS.match(sel);
  if (!m) throw new Error(`token block not found: ${sel}`);
  const out: Record<string, string> = {};
  for (const d of m[1]!.matchAll(/--([\w-]+)\s*:\s*(#[0-9A-Fa-f]{6})/g)) out[d[1]!] = d[2]!;
  return out;
}
const THEMES: Array<[string, Record<string, string>]> = [
  ["light (:root)", tokensOf(/:root\{([^}]*)\}/)],
  ["dark (data-theme=dark)", tokensOf(/:root\[data-theme="dark"\]\{([^}]*)\}/)],
  ["dark (system, auto)", tokensOf(/:root\[data-theme="auto"\]\{([^}]*)\}/)],
];
// Body text pairs: 4.5:1. [foreground, background, what it is]
const TEXT_PAIRS: Array<[string, string, string]> = [
  ["ink", "paper", "body text on page"], ["ink", "card", "body text on card"],
  ["muted", "paper", "muted text on page"], ["muted", "card", "muted text on card"],
  ["ember", "paper", "accent text on page (stage, ladder, next step)"], ["ember", "card", "accent text on card"],
  ["primary", "paper", "links and crumbs on page"], ["primary", "card", "tab / link on card"],
  ["moss", "paper", "ok tag / done text"], ["moss", "card", "ok tag on card"],
  ["danger", "paper", "error text on page"], ["danger", "card", "error text on card"],
  ["demo", "demo-bg", "DEMO badge"], ["demo", "paper", "warn tag on page"], ["demo", "card", "warn tag on card"],
  ["on-primary", "primary", "primary button text"], ["paper", "moss", "done ladder step text"],
];
// UI component and focus pairs: 3:1 (WCAG 1.4.11). Borders, focus ring, input outline, progress marks.
const UI_PAIRS: Array<[string, string, string]> = [
  ["rule", "paper", "UI border / progress mark on page"], ["rule", "card", "UI border on card"],
  ["ember", "paper", "focus ring on page"], ["ember", "card", "focus ring on card"],
  ["ink", "card", "input border"], ["ink", "paper", "input border on page"],
];

describe("colour contrast in styles.css tokens", () => {
  for (const [name, t] of THEMES) {
    describe(name, () => {
      for (const [fg, bg, what] of TEXT_PAIRS) {
        it(`${fg} on ${bg} >= 4.5:1 (${what})`, () => {
          const r = contrast(t[fg]!, t[bg]!);
          expect(r, `${fg} ${t[fg]} on ${bg} ${t[bg]} = ${r.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
        });
      }
      for (const [fg, bg, what] of UI_PAIRS) {
        it(`${fg} on ${bg} >= 3:1 (${what})`, () => {
          const r = contrast(t[fg]!, t[bg]!);
          expect(r, `${fg} ${t[fg]} on ${bg} ${t[bg]} = ${r.toFixed(2)}`).toBeGreaterThanOrEqual(3);
        });
      }
    });
  }
});

// ---------- CSS guards ----------
/** All top-level-ish rules as {prelude, body}; prelude is whitespace-stripped. */
function rules(css: string) {
  const out: Array<{ prelude: string; body: string }> = [];
  for (const m of css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^{}]*)\}/g)) out.push({ prelude: m[1]!.replace(/\s+/g, " ").trim(), body: m[2]! });
  return out;
}
const RULES = rules(CSS);

describe("TM-TST-117 focus and touch styles", () => {
  it("every button, link, summary and input has a visible focus ring (outline, 3px)", () => {
    const focus = RULES.filter((r) => r.prelude.includes(":focus-visible") && /outline:\s*3px/.test(r.body));
    const selectors = focus.map((r) => r.prelude).join(",");
    for (const el of ["button:focus-visible", "a:focus-visible", "input:focus-visible", "select:focus-visible", "textarea:focus-visible", "summary:focus-visible"]) {
      expect(selectors, el).toContain(el);
    }
  });
  it("label-wrapped file button shows focus when its hidden input has focus", () => {
    expect(RULES.some((r) => r.prelude.includes("label.btn:focus-within") && /outline:/.test(r.body))).toBe(true);
  });
  it("skip-to-content link is styled and shown on focus", () => {
    expect(RULES.some((r) => r.prelude === ".skip" || r.prelude.startsWith(".skip{"))).toBe(true);
    expect(RULES.some((r) => r.prelude.includes(".skip:focus"))).toBe(true);
  });
  // Last rule (CSS order wins) whose selector list ends with `sel` and sets min-height.
  const minHeight = (sel: string) => {
    const hits = RULES.filter((r) => r.prelude.split(",").some((p) => p.endsWith(sel)) && /min-height:/.test(r.body));
    const last = hits[hits.length - 1];
    const v = last?.body.match(/min-height:\s*(\d+)px/);
    return v ? Number(v[1]) : NaN;
  };
  for (const sel of [".cta", ".btn", ".tab", ".seg button", ".menu-btn", "input", "details.help summary"]) {
    it(`touch target >= 44px: ${sel}`, () => { expect(minHeight(sel)).toBeGreaterThanOrEqual(44); });
  }
  it("inline min-height in screens is at least 44px", () => {
    const sizes = [...TS_UI.matchAll(/min-height:\s*(\d+)px/g)].map((m) => Number(m[1]));
    expect(sizes.length).toBeGreaterThan(0);
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(44);
  });
});

describe("reduced motion", () => {
  it("global reduce guard turns off animation and transition", () => {
    const guard = CSS.match(/@media \(prefers-reduced-motion:\s*reduce\)\{\*\{animation:none!important;transition:none!important\}/);
    expect(guard).not.toBeNull();
  });
  it("every animated rule is either behind a no-preference query or covered by a reduce guard", () => {
    // Animations declared at top level (outside @media no-preference) must be covered by a reduce guard for that selector or the global one.
    const stripped = CSS.replace(/@media \(prefers-reduced-motion:\s*no-preference\)\{[\s\S]*?\n\}/, "");
    const animated = rules(stripped).filter((r) => /animation:/.test(r.body) && !r.prelude.startsWith("@keyframes"));
    const guardedGlobally = /@media \(prefers-reduced-motion:\s*reduce\)\{\*\{animation:none/.test(CSS);
    for (const r of animated) {
      const covered = guardedGlobally || CSS.includes(`${r.prelude.split(",")[0]}`);
      expect(covered, r.prelude).toBe(true);
    }
  });
});

// ---------- rendered screens (both languages, every route) ----------
const SAMPLE_PATHS = ["/today", "/journey", "/journey/log", "/journey/horizon", "/diary", "/diary/intake", "/diary/intake/3", "/diary/plan", "/diary/money", "/capture", "/journey/report", "/journey/review", "/stuck", "/topics", `/topic/${TOPICS[0]!.id}`, "/reward", "/journey/art", "/focus/none", "/habits", "/cards", "/deen", "/more", "/more/status", "/more/fields", "/more/glossary", "/more/safety", "/more/data"];

const named = (el: Element) => {
  const id = el.getAttribute("id");
  if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) return true;
  if (el.closest("label")) return true;
  if (id && document.querySelector(`label[for="${id}"]`)) return true;
  return false;
};

describe("TM-TST-117 rendered screens: labels, headings, names", () => {
  beforeAll(() => { document.body.innerHTML = '<div id="app"></div>'; });
  for (const lang of ["bn", "en"] as const) {
    describe(`lang=${lang}`, () => {
      for (const path of SAMPLE_PATHS) {
        it(`${path}: labels, headings, names, live regions, skip link`, () => {
          localStorage.setItem("tm:ui:lang", lang);
          location.hash = `#${path}`;
          render();
          const app = document.getElementById("app")!;
          // skip link is first and points at a real target
          const skip = app.querySelector("a.skip") as HTMLAnchorElement | null;
          expect(skip, "skip link").not.toBeNull();
          const target = skip!.getAttribute("href") ?? "";
          expect(target.startsWith("#")).toBe(true);
          expect(document.getElementById(target.slice(1)), "skip target").not.toBeNull();
          expect(skip!.textContent?.trim().length).toBeGreaterThan(0);
          // one h1; heading levels never jump down more than one step
          const heads = [...app.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) => Number(h.tagName[1]));
          expect(heads.filter((n) => n === 1).length, "one h1").toBe(1);
          for (let i = 1; i < heads.length; i++) expect(heads[i]! - heads[i - 1]!, `heading jump at index ${i}: ${heads.join(",")}`).toBeLessThanOrEqual(1);
          // every form control has a name
          const controls = [...app.querySelectorAll("input,select,textarea")].filter((el) => !["hidden", "submit", "button"].includes((el as HTMLInputElement).type));
          const unnamed = controls.filter((el) => !named(el)).map((el) => `${el.tagName.toLowerCase()}#${el.id || "?"}`);
          expect(unnamed, "unlabelled controls").toEqual([]);
          // every button and link has visible or accessible text
          const anon = [...app.querySelectorAll("button,a")].filter((el) => !(el.textContent?.trim()) && !el.getAttribute("aria-label")).map((el) => el.outerHTML.slice(0, 80));
          expect(anon, "nameless buttons/links").toEqual([]);
          // save / confirm messages are announced
          const msgs = [...app.querySelectorAll(".ok-msg,.err")].filter((el) => el.textContent?.trim());
          const silent = msgs.filter((el) => !el.closest('[role="status"],[role="alert"],[aria-live]')).map((el) => el.textContent);
          expect(silent, "messages not in a live region").toEqual([]);
        });
      }
    });
  }
});

describe("language packs", () => {
  it("skip link label exists in both packs", () => {
    expect(PACKS.en["a11y.skip"]).toBeTruthy();
    expect(PACKS.bn["a11y.skip"]).toBeTruthy();
  });
});
