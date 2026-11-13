// The Bangla "Where we are" page (audit Q2): it exists, is Bangla, uses Latin digits, and its module counts match the code.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MODULES, buildLabel } from "../src/modules/capability";

const page = readFileSync("docs/owner/WHERE_WE_ARE_BN.md", "utf8");
describe("docs/owner/WHERE_WE_ARE_BN.md", () => {
  it("is mostly Bangla, with Latin digits only", () => { expect((page.match(/[ঀ-৿]/g) ?? []).length).toBeGreaterThan(500); expect(page).not.toMatch(/[০-৯]/); });
  it("module counts match src/modules/capability.ts", () => {
    const c = (l: string) => MODULES.filter((m) => buildLabel(m) === l).length;
    expect(page).toContain(`${MODULES.length}টি মডিউলের মধ্যে ${c("complete")}টি পুরো তৈরি, ${c("partial")}টি আংশিক, ${c("blocked")}টি পারমিশনের অপেক্ষায়`);
  });
  it("names the owner-only tasks and the closed approvals, and promises no returns", () => {
    for (const w of ["অফলাইন টেস্ট", "লক-স্ক্রিন", "ইসলামিক ফাউন্ডেশন", "বাংলা রিভিউ", "হোস্টিং", "D-C", "D-D"]) expect(page).toContain(w);
    expect(page).not.toMatch(/গ্যারান্টি|নিশ্চিত লাভ|স্কোর|র‍্যাঙ্ক|স্ট্রিক/);
  });
  it("README links to it", () => { expect(readFileSync("README.md", "utf8")).toContain("docs/owner/WHERE_WE_ARE_BN.md"); });
});
