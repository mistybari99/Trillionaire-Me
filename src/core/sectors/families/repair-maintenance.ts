// Repair and maintenance. Data only. No numbers, no benchmarks. See docs/design/sector-model.md.
import type { SectorFamily } from "../types";

export const repairMaintenance: SectorFamily = {
  id: "repair-maintenance",
  name: { en: "Repair and maintenance", bn: "রিপেয়ার ও মেইনটেন্যান্স" },
  summary: {
    en: "Fixes phones, electronics, vehicles, appliances or machines. Parts cost, technician time, repeat repairs and unclaimed devices matter most.",
    bn: "মোবাইল, ইলেকট্রনিক্স, গাড়ি, যন্ত্রপাতি বা মেশিন মেরামত। পার্টসের খরচ, টেকনিশিয়ানের সময়, একই কাজ আবার করা আর নিতে না আসা যন্ত্র সবচেয়ে জরুরি।",
  },
  aliases: {
    en: ["repair", "mobile repair", "workshop", "garage", "servicing", "maintenance", "electronics repair", "appliance repair", "mechanic"],
    bn: ["রিপেয়ার", "মেরামত", "মোবাইল সার্ভিসিং", "গ্যারেজ", "ওয়ার্কশপ", "মিস্ত্রি", "সার্ভিস সেন্টার"],
  },
  inputs: [
    { id: "jobPrice", label: { en: "Average charge per repair job", bn: "প্রতি রিপেয়ার জবে গড় চার্জ" }, unit: "money", perPeriod: false, required: true },
    { id: "partsCost", label: { en: "Average parts cost per job", bn: "প্রতি জবে গড় পার্টসের খরচ" }, unit: "money", perPeriod: false, required: true },
    { id: "fixed", label: { en: "Fixed costs for the month (rent, technician pay, tools)", bn: "মাসের ফিক্সড খরচ (ভাড়া, টেকনিশিয়ানের বেতন, টুলস)" }, unit: "money", perPeriod: true, required: true },
    { id: "revenue", label: { en: "Sales for the month (repairs and parts)", bn: "মাসের মোট বিক্রি (রিপেয়ার ও পার্টস)" }, unit: "money", perPeriod: true },
    { id: "cogs", label: { en: "Parts cost of the work done in the month", bn: "মাসে করা কাজের পার্টসের খরচ" }, unit: "money", perPeriod: true },
    { id: "jobsDone", label: { en: "Jobs finished in the month", bn: "মাসে শেষ করা জব" }, unit: "qty", perPeriod: true },
    { id: "jobsRedone", label: { en: "Jobs that came back for the same fault", bn: "একই সমস্যায় ফেরত আসা জব" }, unit: "qty", perPeriod: true },
    { id: "techHoursUsed", label: { en: "Technician hours spent on paid jobs", bn: "পেইড জবে টেকনিশিয়ানের কাটানো ঘণ্টা" }, unit: "qty", perPeriod: true },
    { id: "techHoursAvailable", label: { en: "Technician hours available in the month", bn: "মাসে টেকনিশিয়ানের কাজ করার মতো ঘণ্টা" }, unit: "qty", perPeriod: true },
    { id: "partsStock", label: { en: "Spare parts in stock, at buying cost", bn: "স্টকে থাকা স্পেয়ার পার্টস, কেনা দামে" }, unit: "money", perPeriod: false },
    { id: "receivables", label: { en: "Money customers still owe you", bn: "কাস্টমারের কাছে বাকি পাওনা" }, unit: "money", perPeriod: false },
    { id: "periodDays", label: { en: "Days in the month you are counting", bn: "যে মাসের হিসাব করছেন তার দিন সংখ্যা" }, unit: "days", perPeriod: true },
  ],
  formulas: [
    { id: "jobMargin", use: "contributionMargin", map: { price: "jobPrice", varCost: "partsCost" } },
    { id: "jobMarginPct", use: "contributionMarginPct", map: { price: "jobPrice", varCost: "partsCost" } },
    { id: "breakEvenJobs", use: "breakEvenUnits", map: { fixed: "fixed", price: "jobPrice", varCost: "partsCost" } },
    { id: "grossMarginMonth", use: "grossMargin", map: { revenue: "revenue", cogs: "cogs" } },
    { id: "redoRate", name: { en: "Share of jobs that came back", bn: "ফেরত আসা জবের অংশ" }, use: "shareOfQty", map: { partQty: "jobsRedone", wholeQty: "jobsDone" } },
    { id: "techUse", name: { en: "Share of technician hours used", bn: "টেকনিশিয়ানের ঘণ্টার কতটা কাজে লেগেছে" }, use: "capacityUtilisation", map: { used: "techHoursUsed", capacity: "techHoursAvailable" } },
    { id: "partsDays", name: { en: "Days of parts stock on hand", bn: "হাতে থাকা পার্টস স্টক কত দিনের" }, use: "inventoryDays", map: { inventory: "partsStock", cogs: "cogs", periodDays: "periodDays" } },
    { id: "customerPayDays", use: "receivableDays", map: { receivables: "receivables", revenue: "revenue", periodDays: "periodDays" } },
  ],
  questions: [
    { en: "Do you give a written warranty on the work and on the parts, and who pays if it fails?", bn: "কাজ আর পার্টসের উপর কি লিখিত ওয়ারেন্টি দেন, আর ফেল করলে খরচ কে দেয়?" },
    { en: "Do you keep a record of each device received, its fault and its owner?", bn: "প্রতিটা যন্ত্র কার, কী সমস্যা, তার রেকর্ড রাখেন?" },
    { en: "Where do you buy parts, and how do you know they are genuine?", bn: "পার্টস কোথা থেকে কেনেন, আর আসল কি না কীভাবে বোঝেন?" },
    { en: "What happens to devices that customers never come back for?", bn: "যেসব যন্ত্র কাস্টমার নিতে আসে না সেগুলোর কী হয়?" },
  ],
  risks: [
    { en: "Repeat repairs for the same fault, with no extra pay.", bn: "একই সমস্যায় বারবার ফ্রি কাজ করতে হওয়া।" },
    { en: "Customer data or devices lost, damaged or misused while in your shop.", bn: "দোকানে রাখা কাস্টমারের ডাটা বা যন্ত্র হারানো, নষ্ট হওয়া বা অপব্যবহার।" },
    { en: "Fake or poor parts causing failures and angry customers.", bn: "নকল বা খারাপ পার্টসে ফেল করে কাস্টমার বিরক্ত হওয়া।" },
    { en: "Parts bought in advance that no one needs any more.", bn: "আগে কেনা পার্টস যা আর কারও দরকার নেই।" },
    { en: "A key technician leaving and taking the skill and customers.", bn: "মূল টেকনিশিয়ান চলে গিয়ে দক্ষতা আর কাস্টমার নিয়ে যাওয়া।" },
  ],
  seasonal: false,
  related: { paths: [], halalCheck: true },
};
