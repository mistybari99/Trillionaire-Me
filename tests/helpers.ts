import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

export function walk(dir: string, exts: string[]): string[] {
  const out: string[] = [];
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) out.push(...walk(p, exts));
    else if (exts.some((e) => p.endsWith(e))) out.push(p);
  }
  return out;
}
export const read = (p: string) => readFileSync(p, "utf8");
export const srcFiles = () => walk("src", [".ts", ".css", ".html"]);
