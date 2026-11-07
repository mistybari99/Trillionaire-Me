// Creative, design and print. Data only. No numbers, no benchmarks. See docs/design/sector-model.md.
import type { SectorFamily } from "../types";

export const creativeDesignPrint: SectorFamily = {
  id: "creative-design-print",
  name: { en: "Design, print and signage", bn: "ডিজাইন, প্রিন্ট ও সাইনেজ" },
  summary: {
    en: "Designs and prints jobs for clients: graphics, press work, banners, signs, ads. Paper and ink waste, machine time and job costing matter most.",
    bn: "ক্লায়েন্টের জন্য ডিজাইন ও প্রিন্টের কাজ: গ্রাফিক্স, প্রেসের কাজ, ব্যানার, সাইন, অ্যাড। কাগজ ও কালির অপচয়, মেশিনের সময় আর জব কস্টিং সবচেয়ে জরুরি।",
  },
  aliases: {
    en: ["printing press", "graphic design", "signboard", "signage", "banner", "advertising", "digital print", "screen print", "packaging print"],
    bn: ["প্রিন্টিং প্রেস", "গ্রাফিক ডিজাইন", "সাইনবোর্ড", "ব্যানার", "বিজ্ঞাপন", "ডিজিটাল প্রিন্ট"],
  },
  inputs: [
    { id: "jobPrice", label: { en: "Price charged per job", bn: "প্রতি জবে নেওয়া দাম" }, unit: "money", perPeriod: false, required: true },
    { id: "jobCost", label: { en: "Material and labour cost per job", bn: "প্রতি জবের মালামাল ও লেবার খরচ" }, unit: "money", perPeriod: false, required: true },
    { id: "fixed", label: { en: "Fixed costs for the month (rent, power, machine upkeep)", bn: "মাসের ফিক্সড খরচ (ভাড়া, বিদ্যুৎ, মেশিন মেইনটেন্যান্স)" }, unit: "money", perPeriod: true, required: true },
    { id: "revenue", label: { en: "Sales for the month", bn: "মাসের মোট বিক্রি" }, unit: "money", perPeriod: true },
    { id: "cogs", label: { en: "Material cost of the jobs done in the month", bn: "মাসে করা জবের মালামালের খরচ" }, unit: "money", perPeriod: true },
    { id: "materialBought", label: { en: "Paper, ink and board put into jobs", bn: "জবে লাগানো কাগজ, কালি ও বোর্ড" }, unit: "qty", perPeriod: true },
    { id: "materialGood", label: { en: "Paper, ink and board that ended in good finished work", bn: "ভালো তৈরি কাজে যে কাগজ, কালি ও বোর্ড গেছে" }, unit: "qty", perPeriod: true },
    { id: "machineHoursUsed", label: { en: "Machine hours used in the month", bn: "মাসে মেশিন চলা ঘণ্টা" }, unit: "qty", perPeriod: true },
    { id: "machineHoursAvailable", label: { en: "Machine hours available in the month", bn: "মাসে মেশিন চালানো যায় এমন ঘণ্টা" }, unit: "qty", perPeriod: true },
    { id: "inventory", label: { en: "Paper and material stock, at buying cost", bn: "কাগজ ও মালামালের স্টক, কেনা দামে" }, unit: "money", perPeriod: false },
    { id: "receivables", label: { en: "Money clients still owe you", bn: "ক্লায়েন্টের কাছে বাকি পাওনা" }, unit: "money", perPeriod: false },
    { id: "periodDays", label: { en: "Days in the month you are counting", bn: "যে মাসের হিসাব করছেন তার দিন সংখ্যা" }, unit: "days", perPeriod: true },
  ],
  formulas: [
    { id: "jobMargin", use: "contributionMargin", map: { price: "jobPrice", varCost: "jobCost" } },
    { id: "jobMarginPct", use: "contributionMarginPct", map: { price: "jobPrice", varCost: "jobCost" } },
    { id: "breakEvenJobs", use: "breakEvenUnits", map: { fixed: "fixed", price: "jobPrice", varCost: "jobCost" } },
    { id: "grossMarginMonth", use: "grossMargin", map: { revenue: "revenue", cogs: "cogs" } },
    { id: "materialYield", use: "yieldRate", map: { outputQty: "materialGood", inputQty: "materialBought" } },
    { id: "materialWaste", use: "lossRate", map: { outputQty: "materialGood", inputQty: "materialBought" } },
    { id: "machineUse", use: "capacityUtilisation", map: { used: "machineHoursUsed", capacity: "machineHoursAvailable" } },
    { id: "clientPayDays", use: "receivableDays", map: { receivables: "receivables", revenue: "revenue", periodDays: "periodDays" } },
    { id: "stockDays", use: "inventoryDays", map: { inventory: "inventory", cogs: "cogs", periodDays: "periodDays" } },
  ],
  questions: [
    { en: "Do you cost each job with material, labour, machine time and waste before quoting?", bn: "কোটেশন দেওয়ার আগে প্রতিটা জবের মালামাল, লেবার, মেশিনের সময় আর অপচয় হিসাব করেন?" },
    { en: "Do clients pay an advance, and who owns the design files?", bn: "ক্লায়েন্ট কি অ্যাডভান্স দেয়, আর ডিজাইন ফাইলের মালিক কে?" },
    { en: "How often do reprints happen because of mistakes in approval?", bn: "অ্যাপ্রুভালের ভুলে কতবার আবার ছাপতে হয়?" },
    { en: "Which machines are idle, and which ones limit how many jobs you can take?", bn: "কোন মেশিন বসে থাকে, আর কোনটার জন্য বেশি জব নিতে পারেন না?" },
  ],
  risks: [
    { en: "Paper or ink price rising after you quoted the job.", bn: "কোটেশন দেওয়ার পর কাগজ বা কালির দাম বেড়ে যাওয়া।" },
    { en: "Wrong spelling or colour printed, so the whole job is redone.", bn: "ভুল বানান বা রং ছাপা হয়ে পুরো জব আবার করা।" },
    { en: "Clients not collecting or paying for finished jobs.", bn: "তৈরি জব ক্লায়েন্ট না নেওয়া বা টাকা না দেওয়া।" },
    { en: "Machine breakdown stopping all jobs together.", bn: "মেশিন বিকল হয়ে সব জব একসাথে আটকে যাওয়া।" },
  ],
  seasonal: true,
  related: { paths: [], halalCheck: true },
};
