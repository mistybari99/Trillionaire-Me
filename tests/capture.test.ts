import { describe, expect, it } from "vitest";
import { extract, summarize } from "../src/core/capture";

const now = new Date(2026, 9, 24); // Sat 24 Oct 2026
const by = (t: string, k: string) => extract(t, now).filter((c) => c.kind === k);

describe("quick capture: rules, no AI", () => {
  it("amounts in Bangla and English, with magnitude words", () => {
    expect(by("সরবরাহকারীকে ৫০০০ টাকা দিলাম", "amount")[0]).toMatchObject({ number: 5000, unit: "BDT", confidence: "high" });
    expect(by("৫ হাজার টাকা", "amount")[0]!.number).toBe(5000);
    expect(by("loan 2.5 lakh tk", "amount")[0]!.number).toBe(250000);
    expect(by("paid 1,20,000 BDT", "amount")[0]!.number).toBe(120000);
    expect(by("৳ ৭৫০", "amount")[0]!.number).toBe(750);
    expect(by("৩ হাজার", "amount")[0]!.confidence).toBe("low"); // magnitude without currency: asks the user to confirm
  });
  it("a bare number is never guessed to be money", () => { expect(by("I met 12 people and bought 3 items", "amount")).toEqual([]); });
  it("percent, duration (to minutes), dates", () => {
    expect(by("মুনাফা ১০ শতাংশ", "percent")[0]!.number).toBe(10);
    expect(by("২ ঘণ্টা কাজ", "duration")[0]).toMatchObject({ number: 120, unit: "minutes" });
    expect(by("took 45 min", "duration")[0]!.number).toBe(45);
    expect(by("৩ মাস সময়", "duration")[0]).toMatchObject({ number: 3, unit: "months" });
    expect(by("deadline 2026-11-05", "date")[0]!.date).toBe("2026-11-05");
    expect(by("tomorrow", "date")[0]!.date).toBe("2026-10-25");
    expect(by("পরশু দেখা", "date")[0]!.date).toBe("2026-10-26");
    expect(by("সোমবার মিটিং", "date")[0]!.date).toBe("2026-10-26");
    expect(by("কাল দেব", "date")[0]!.confidence).toBe("low"); // 'কাল' can mean yesterday or tomorrow
    expect(by("2026-02-31", "date")).toEqual([]);
  });
  it("durations are not double-counted as amounts or dates", () => { const r = extract("২ ঘণ্টা কাজ ও ৫০০ টাকা", now); expect(r.filter((c) => c.kind === "duration")).toHaveLength(1); expect(r.filter((c) => c.kind === "amount")).toHaveLength(1); });
  it("decisions are picked out sentence by sentence", () => {
    const r = by("আজ দোকানে গেলাম। ঠিক করলাম নতুন সরবরাহকারী নেব। I decided to stop the old plan.", "decision");
    expect(r.map((x) => x.text)).toEqual(["ঠিক করলাম নতুন সরবরাহকারী নেব", "I decided to stop the old plan"]);
  });
  it("plain notes with nothing to extract give nothing (no invented data)", () => { expect(extract("আজ ভালো লাগছে", now).filter((c) => c.kind !== "date")).toEqual([]); expect(extract("", now)).toEqual([]); });
  it("report totals use only the confirmed items", () => {
    const s = summarize([{ kind: "amount", number: 5000 }, { kind: "amount", number: 250 }, { kind: "duration", number: 120, unit: "minutes" }, { kind: "duration", number: 3, unit: "months" }, { kind: "decision", text: "নেব" }, { kind: "date", date: "2026-11-05" }, { kind: "date", date: "2026-10-26" }]);
    expect(s).toEqual({ decisions: ["নেব"], amountTotal: 5250, amountCount: 2, durationMinutes: 120, dates: ["2026-10-26", "2026-11-05"] });
  });
});
