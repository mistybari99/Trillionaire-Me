// Construction and contracting. Data only. No numbers, no benchmarks. See docs/design/sector-model.md.
import type { SectorFamily } from "../types";

export const constructionContracting: SectorFamily = {
  id: "construction-contracting",
  name: { en: "Construction and contracting (builder, civil, electrical, interior)", bn: "নির্মাণ ও কন্ট্রাক্টিং (বিল্ডার, সিভিল, ইলেকট্রিক্যাল, ইন্টেরিয়র)" },
  summary: {
    en: "Builds or fits out for clients on a contract. Cost overrun, slow client payments and idle crews decide the result.",
    bn: "ক্লায়েন্টের জন্য চুক্তিতে কাজ করা। খরচ বেড়ে যাওয়া, ক্লায়েন্টের দেরিতে পেমেন্ট আর ক্রু বসে থাকার ওপর ফলাফল নির্ভর করে।",
  },
  aliases: {
    en: ["builder", "contractor", "civil work", "electrical work", "plumbing", "interior design", "renovation", "tender", "fit out"],
    bn: ["বিল্ডার", "ঠিকাদার", "কন্ট্রাক্টর", "সিভিল কাজ", "ইলেকট্রিক কাজ", "প্লাম্বিং", "ইন্টেরিয়র", "টেন্ডার"],
  },
  inputs: [
    { id: "contractValue", label: { en: "Contract value of the job", bn: "কাজের চুক্তির মোট দাম" }, unit: "money", perPeriod: false, required: true },
    { id: "materialCost", label: { en: "Material cost for the job", bn: "কাজের ম্যাটেরিয়াল খরচ" }, unit: "money", perPeriod: false, required: true },
    { id: "labourCost", label: { en: "Labour and subcontract cost for the job", bn: "কাজের শ্রমিক ও সাব-কন্ট্রাক্ট খরচ" }, unit: "money", perPeriod: false, required: true },
    { id: "overhead", label: { en: "Office and site overhead for the month", bn: "মাসের অফিস ও সাইটের ওভারহেড" }, unit: "money", perPeriod: true },
    { id: "budgetCost", label: { en: "Cost you planned for the job", bn: "কাজের জন্য ধরা পরিকল্পিত খরচ" }, unit: "money", perPeriod: false },
    { id: "actualCost", label: { en: "Cost spent so far on the job", bn: "কাজে এ পর্যন্ত হওয়া খরচ" }, unit: "money", perPeriod: false },
    { id: "billed", label: { en: "Amount billed to the client", bn: "ক্লায়েন্টকে বিল করা পরিমাণ" }, unit: "money", perPeriod: true },
    { id: "clientOwes", label: { en: "Billed but not yet paid by the client", bn: "বিল করা হয়েছে কিন্তু ক্লায়েন্ট এখনো দেয়নি" }, unit: "money", perPeriod: false },
    { id: "periodDays", label: { en: "Days in the period", bn: "পিরিয়ডের দিন সংখ্যা" }, unit: "days", perPeriod: true },
    { id: "workDaysUsed", label: { en: "Days your crew worked on jobs", bn: "ক্রু যত দিন কাজে ছিল" }, unit: "qty", perPeriod: true },
    { id: "workDaysAvailable", label: { en: "Days your crew was available", bn: "ক্রু যত দিন হাতে ছিল" }, unit: "qty", perPeriod: true },
  ],
  formulas: [
    { id: "jobProfit", name: { en: "Profit on the job", bn: "কাজের মুনাফা" }, expr: "contractValue - materialCost - labourCost", needs: ["contractValue", "materialCost", "labourCost"], result: "money" },
    { id: "jobMarginPct", use: "grossMargin", map: { revenue: "contractValue", cogs: "materialCost" }, name: { en: "Margin after material (percent)", bn: "ম্যাটেরিয়ালের পর মার্জিন (শতাংশ)" } },
    { id: "overrun", name: { en: "Cost above plan", bn: "পরিকল্পনার চেয়ে বেশি খরচ" }, expr: "actualCost - budgetCost", needs: ["actualCost", "budgetCost"], result: "money" },
    { id: "payDays", use: "receivableDays", map: { receivables: "clientOwes", revenue: "billed", periodDays: "periodDays" }, name: { en: "Days to get paid by clients", bn: "ক্লায়েন্টের কাছ থেকে টাকা পেতে দিন" } },
    { id: "crewUse", use: "capacityUtilisation", map: { used: "workDaysUsed", capacity: "workDaysAvailable" }, name: { en: "Crew days on jobs (percent)", bn: "কাজে থাকা ক্রু-দিন (শতাংশ)" } },
    { id: "labourShare", use: "shareOfMoney", map: { part: "labourCost", whole: "contractValue" }, name: { en: "Labour cost (percent of contract)", bn: "শ্রমের খরচ (চুক্তির শতাংশ)" } },
  ],
  questions: [
    { en: "How do you price a job, and what is kept aside for surprises?", bn: "কাজের দাম কীভাবে ঠিক করেন, আর অপ্রত্যাশিত খরচের জন্য কী আলাদা রাখেন?" },
    { en: "What are the payment stages, and what if the client delays?", bn: "পেমেন্টের ধাপ কী কী, আর ক্লায়েন্ট দেরি করলে কী হবে?" },
    { en: "Which jobs need a licence, approval or safety check?", bn: "কোন কাজে লাইসেন্স, অনুমোদন বা সেফটি চেক লাগে?" },
    { en: "Who supervises the site when you are not there?", bn: "আপনি না থাকলে সাইট কে দেখে?" },
  ],
  risks: [
    { en: "Material prices rise after the contract is signed.", bn: "চুক্তির পর ম্যাটেরিয়ালের দাম বেড়ে যায়।" },
    { en: "Client pays late and cash runs short.", bn: "ক্লায়েন্ট দেরিতে দেয়, ক্যাশ কম পড়ে।" },
    { en: "Work stops because of weather or missing approvals.", bn: "আবহাওয়া বা অনুমোদন না পাওয়ায় কাজ থেমে যায়।" },
    { en: "Site accidents and injuries.", bn: "সাইটে দুর্ঘটনা ও আঘাত।" },
    { en: "Rework when the job does not meet the agreed quality.", bn: "চুক্তির মান না মিললে আবার কাজ করতে হয়।" },
  ],
  seasonal: true,
  related: { paths: [], halalCheck: true },
};
