// Discrete manufacturing (small factory, workshop). Data only. No numbers, no benchmarks. See docs/design/sector-model.md.
import type { SectorFamily } from "../types";

export const manufacturingDiscrete: SectorFamily = {
  id: "manufacturing-discrete",
  name: { en: "Manufacturing (factory, workshop)", bn: "ম্যানুফ্যাকচারিং (কারখানা, ওয়ার্কশপ)" },
  summary: {
    en: "Makes countable products such as furniture, metal or plastic goods. Material cost, machine use and scrap decide the result.",
    bn: "পিস ধরে পণ্য বানায়, যেমন ফার্নিচার, ধাতু বা প্লাস্টিকের জিনিস। কাঁচামালের খরচ, মেশিনের ব্যবহার আর নষ্ট মালের ওপর ফলাফল নির্ভর করে।",
  },
  aliases: {
    en: ["factory", "workshop", "manufacturing", "furniture maker", "metal works", "plastic factory", "packaging", "small industry", "production unit"],
    bn: ["কারখানা", "ওয়ার্কশপ", "ফ্যাক্টরি", "ফার্নিচার", "প্লাস্টিক কারখানা", "প্যাকেজিং", "ছোট শিল্প"],
  },
  inputs: [
    { id: "price", label: { en: "Selling price of one finished unit", bn: "একটা তৈরি ইউনিটের বিক্রির দাম" }, unit: "money", perPeriod: false, required: true },
    { id: "varCost", label: { en: "Material, labour and power cost of one unit", bn: "একটা ইউনিটের কাঁচামাল, শ্রম ও বিদ্যুতের খরচ" }, unit: "money", perPeriod: false, required: true },
    { id: "fixed", label: { en: "Fixed costs for the month (rent, salaries, loan instalment)", bn: "মাসের ফিক্সড খরচ (ভাড়া, বেতন, ঋণের কিস্তি)" }, unit: "money", perPeriod: true, required: true },
    { id: "revenue", label: { en: "Sales for the period", bn: "সময়ের মোট বিক্রি" }, unit: "money", perPeriod: true },
    { id: "cogs", label: { en: "Cost of goods sold in the period", bn: "সময়ে বিক্রি হওয়া মালের খরচ" }, unit: "money", perPeriod: true },
    { id: "receivables", label: { en: "Unpaid amount from customers now", bn: "ক্রেতার কাছে এখন বাকি পাওনা" }, unit: "money", perPeriod: false },
    { id: "inventory", label: { en: "Value of raw material and finished stock now", bn: "কাঁচামাল ও তৈরি মালের এখনকার দাম" }, unit: "money", perPeriod: false },
    { id: "payables", label: { en: "Amount you owe suppliers now", bn: "সাপ্লায়ারকে এখন যা দিতে হবে" }, unit: "money", perPeriod: false },
    { id: "periodDays", label: { en: "Days in the period", bn: "সময়ের দিন সংখ্যা" }, unit: "days", perPeriod: false },
    { id: "unitsMade", label: { en: "Units made in the period", bn: "সময়ে বানানো ইউনিট" }, unit: "qty", perPeriod: true },
    { id: "capacityUnits", label: { en: "Units the machines could make in the period", bn: "সময়ে মেশিনে মোট যত ইউনিট বানানো সম্ভব ছিল" }, unit: "qty", perPeriod: true },
    { id: "scrapQty", label: { en: "Material wasted or units rejected", bn: "নষ্ট কাঁচামাল বা বাতিল ইউনিট" }, unit: "qty", perPeriod: true },
    { id: "materialQty", label: { en: "All material used (same unit as wasted)", bn: "মোট ব্যবহৃত কাঁচামাল (নষ্টের একই ইউনিটে)" }, unit: "qty", perPeriod: true },
  ],
  formulas: [
    { id: "unitMargin", use: "contributionMargin", map: { price: "price", varCost: "varCost" } },
    { id: "unitMarginPct", use: "contributionMarginPct", map: { price: "price", varCost: "varCost" } },
    { id: "breakEvenUnits", use: "breakEvenUnits", map: { fixed: "fixed", price: "price", varCost: "varCost" } },
    { id: "grossMargin", use: "grossMargin", map: { revenue: "revenue", cogs: "cogs" } },
    { id: "machineUse", use: "capacityUtilisation", map: { used: "unitsMade", capacity: "capacityUnits" } },
    { id: "scrapPct", use: "lossRate", map: { outputQty: "scrapQty", inputQty: "materialQty" }, name: { en: "Scrap (percent of material used)", bn: "নষ্ট মাল (ব্যবহৃত কাঁচামালের শতাংশ)" } },
    { id: "inventoryDays", use: "inventoryDays", map: { inventory: "inventory", cogs: "cogs", periodDays: "periodDays" } },
    { id: "cashCycle", use: "cashConversion", map: { receivables: "receivables", inventory: "inventory", payables: "payables", revenue: "revenue", cogs: "cogs", periodDays: "periodDays" } },
    { id: "costPerUnit", name: { en: "Cost of one unit made (cost of goods divided by units made)", bn: "একটা ইউনিট বানাতে খরচ (মালের খরচ ভাগ বানানো ইউনিট)" }, expr: "cogs / unitsMade", needs: ["cogs", "unitsMade"], result: "money" },
  ],
  questions: [
    { en: "Which machine stops most often, and what does one stop cost you?", bn: "কোন মেশিন সবচেয়ে বেশি বন্ধ থাকে, আর একবার বন্ধ হলে আপনার কত ক্ষতি?" },
    { en: "Do you make to order, or make first and then look for buyers?", bn: "অর্ডার পেয়ে বানান, নাকি আগে বানিয়ে পরে ক্রেতা খোঁজেন?" },
    { en: "Do you depend on one supplier for the main raw material?", bn: "মূল কাঁচামালের জন্য কি একজন সাপ্লায়ারের ওপর নির্ভর করেন?" },
    { en: "Which licences, fire and safety checks apply to your workshop?", bn: "আপনার ওয়ার্কশপে কোন লাইসেন্স এবং ফায়ার ও সেফটি চেক লাগে?" },
  ],
  risks: [
    { en: "Raw material price changes before you can change your price.", bn: "আপনি দাম বদলানোর আগেই কাঁচামালের দাম বদলে যায়।" },
    { en: "Machine breakdown stops all work.", bn: "মেশিন নষ্ট হলে পুরো কাজ বন্ধ হয়ে যায়।" },
    { en: "Power cuts and fuel shortage slow production.", bn: "বিদ্যুৎ না থাকা বা জ্বালানির অভাবে উৎপাদন ধীর হয়।" },
    { en: "Unsold finished stock and unpaid bills lock up money.", bn: "না বিক্রি হওয়া তৈরি মাল আর বাকি বিলে টাকা আটকে যায়।" },
    { en: "Workplace accidents and safety rules.", bn: "কাজের জায়গায় দুর্ঘটনা এবং সেফটির নিয়ম।" },
  ],
  seasonal: false,
  related: { paths: ["business-starter"] },
};
