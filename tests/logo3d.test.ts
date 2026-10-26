// 3D-style logo: bundled inline SVG (no network, no 3D engine), alt text in every language, still under reduced motion.
import "fake-indexeddb/auto";
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { render, renderApp } from "../src/app";
import { store } from "../src/ui/state";
import { logo3d } from "../src/ui/logo";
import { PACKS } from "../src/i18n/packs";

const app = () => document.getElementById("app")!;
const css = readFileSync("src/ui/styles.css", "utf8");
const part = css.slice(css.indexOf("/* 3D-style logo"), css.indexOf("/* language icon menu"));

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); store.demo.clear(); store.real.clear();
  document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en");
});

describe("logo3d", () => {
  it("has the T-bar and the M, obsidian and champagne, a text alternative and a size", () => {
    const l = logo3d(96, "en");
    expect(l.getAttribute("role")).toBe("img"); expect(l.getAttribute("aria-label")).toBe(PACKS.en["logo.alt"]); expect(l.getAttribute("width")).toBe("96");
    expect(l.querySelector("[data-part=t-bar]")).not.toBeNull(); expect(l.querySelector("[data-part=m-mark]")).not.toBeNull();
    const xml = l.outerHTML.toLowerCase();
    expect(xml).toContain("#0b1216"); expect(xml).toContain("#c9a96e");
  });
  it("is self-contained: no link, image, script, foreignObject or network address", () => {
    const x = logo3d(48, "bn").outerHTML;
    expect(x).not.toMatch(/https?:|<image|<script|<foreignObject|href=|<animate|data:/i);
    const src = readFileSync("src/ui/logo.ts", "utf8"); expect(src).not.toMatch(/https?:\/\/|fetch\(|three|WebGL|canvas/i);
  });
  it("gradient ids are unique per copy, so two logos on one page never clash", () => {
    document.body.append(logo3d(48, "en"), logo3d(48, "en"));
    const ids = [...document.querySelectorAll("svg.logo3d linearGradient, svg.logo3d clipPath, svg.logo3d radialGradient")].map((e) => e.id);
    expect(ids.length).toBeGreaterThan(0); expect(new Set(ids).size).toBe(ids.length);
    for (const svg of document.querySelectorAll("svg.logo3d")) for (const u of svg.outerHTML.matchAll(/url\(#([\w-]+)\)/g)) expect(svg.querySelector(`#${u[1]}`), u[1]).not.toBeNull();
  });
  it("only the splash copy carries the shine; it is off by default", () => {
    expect(logo3d(48, "en").querySelector(".logo-shine")).toBeNull(); expect(logo3d(48, "en", { animate: true }).querySelector(".logo-shine")).not.toBeNull();
  });
  it("alt text exists in English, Bangla and Mix with Latin digits only", () => {
    for (const l of ["en", "bn", "mix"] as const) { expect(PACKS[l]["logo.alt"].length).toBeGreaterThan(10); expect(PACKS[l]["logo.alt"]).not.toMatch(/[০-৯]/); }
  });
});

describe("logo placement", () => {
  it("splash (first-run choice), Journey and Reward show it; only the splash is animated", () => {
    renderApp(); expect(app().querySelector("svg.logo3d")).not.toBeNull(); expect(app().querySelector("svg.logo-anim")).not.toBeNull();
    localStorage.setItem("tm:ui:dataMode", "demo");
    for (const h of ["#/journey", "#/reward"]) { location.hash = h; render(); expect(app().querySelector("svg.logo3d"), h).not.toBeNull(); expect(app().querySelector("svg.logo-anim"), h).toBeNull(); }
  });
});

describe("logo motion rules", () => {
  it("one short, non-looping shine inside no-preference, switched off under reduce for the same selector", () => {
    const noPref = [...part.matchAll(/@media \(prefers-reduced-motion:no-preference\)\{([\s\S]*?)\n\}/g)].map((m) => m[1]!).join("\n");
    const outside = part.replace(/@media \(prefers-reduced-motion:no-preference\)\{[\s\S]*?\n\}/g, "").replace(/@keyframes[^{]+\{[\s\S]*?\}\}/g, "");
    expect(noPref).toMatch(/\.logo-anim \.logo-shine\{animation:logoShine 1\.2s ease-out \.4s 1 both\}/);
    expect(outside).not.toMatch(/animation:(?!none)/); expect(part).not.toMatch(/infinite/);
    expect(part).toMatch(/@media \(prefers-reduced-motion:reduce\)\{\.logo-anim \.logo-shine\{animation:none!important/);
  });
});
