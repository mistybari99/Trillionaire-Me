// Light materials: sand, stone, bricks, clay. Data only. No numbers, no benchmarks. See docs/design/sector-model.md.
import type { SectorFamily } from "../types";

export const miningMaterialsQuarry: SectorFamily = {
  id: "mining-materials-quarry",
  name: { en: "Sand, stone and brick materials", bn: "বালু, পাথর ও ইটের মালামাল" },
  summary: {
    en: "Digs, makes or sells sand, stone, clay and bricks. Output, wastage, transport and permit costs decide the result.",
    bn: "বালু, পাথর, মাটি ও ইট তোলা, বানানো বা বিক্রি। আউটপুট, নষ্ট মাল, পরিবহন আর পারমিটের খরচের ওপর ফলাফল নির্ভর করে।",
  },
  aliases: {
    en: ["sand", "stone", "brick field", "brick kiln", "clay", "gravel", "quarry", "stone crusher", "sand lease"],
    bn: ["বালু", "পাথর", "ইটভাটা", "ইট", "মাটি", "খোয়া", "পাথর ভাঙা", "বালুমহাল"],
  },
  inputs: [
    { id: "price", label: { en: "Selling price per unit (truck load, thousand bricks or cubic measure)", bn: "প্রতি ইউনিটের বিক্রির দাম (ট্রাক লোড, হাজার ইট বা ঘন মাপ)" }, unit: "money", perPeriod: false, required: true },
    { id: "varCost", label: { en: "Cost per unit (digging, fuel, labour, transport)", bn: "প্রতি ইউনিটের খরচ (তোলা, জ্বালানি, শ্রমিক, পরিবহন)" }, unit: "money", perPeriod: false, required: true },
    { id: "fixed", label: { en: "Fixed costs for the month (lease, permit, land rent, staff)", bn: "মাসের ফিক্সড খরচ (ইজারা, পারমিট, জমির ভাড়া, স্টাফ)" }, unit: "money", perPeriod: true, required: true },
    { id: "revenue", label: { en: "Sales for the month", bn: "মাসের মোট বিক্রি" }, unit: "money", perPeriod: true },
    { id: "transportCost", label: { en: "Transport and loading cost for the month", bn: "মাসের পরিবহন ও লোডিং খরচ" }, unit: "money", perPeriod: true },
    { id: "rawQty", label: { en: "Raw material taken in (same unit as output)", bn: "ইনপুট কাঁচামাল (আউটপুটের একই ইউনিটে)" }, unit: "qty", perPeriod: true },
    { id: "goodQty", label: { en: "Sellable material produced", bn: "বিক্রির উপযোগী তৈরি মাল" }, unit: "qty", perPeriod: true },
    { id: "usedQty", label: { en: "Quantity worked or sold in the month", bn: "মাসে কাজ করা বা বিক্রি হওয়া পরিমাণ" }, unit: "qty", perPeriod: true },
    { id: "allowedQty", label: { en: "Quantity your permit or lease allows for the month", bn: "পারমিট বা ইজারায় মাসে যতটা অনুমতি আছে" }, unit: "qty", perPeriod: true },
    { id: "receivables", label: { en: "Money buyers still owe you", bn: "ক্রেতার কাছে বকেয়া টাকা" }, unit: "money", perPeriod: false },
    { id: "periodDays", label: { en: "Days in the period you are looking at", bn: "যে সময়ের হিসাব দেখছেন তার দিন সংখ্যা" }, unit: "days", perPeriod: true },
  ],
  formulas: [
    { id: "unitMargin", use: "contributionMargin", map: { price: "price", varCost: "varCost" } },
    { id: "breakEvenUnits", use: "breakEvenUnits", map: { fixed: "fixed", price: "price", varCost: "varCost" } },
    { id: "outputYield", use: "yieldRate", map: { outputQty: "goodQty", inputQty: "rawQty" }, name: { en: "Sellable share of material taken in", bn: "ইনপুটের কতটা বিক্রির উপযোগী" } },
    { id: "wastage", use: "lossRate", map: { outputQty: "goodQty", inputQty: "rawQty" }, name: { en: "Wastage of material taken in", bn: "ইনপুটের নষ্ট অংশ" } },
    { id: "permitUse", use: "capacityUtilisation", map: { used: "usedQty", capacity: "allowedQty" }, name: { en: "How much of the permitted quantity is used", bn: "অনুমতির পরিমাণের কতটা ব্যবহার হয়েছে" } },
    { id: "transportShare", use: "shareOfMoney", map: { part: "transportCost", whole: "revenue" }, name: { en: "Transport cost (percent of sales)", bn: "পরিবহন খরচ (বিক্রির শতাংশ)" } },
    { id: "buyerDays", use: "receivableDays", map: { receivables: "receivables", revenue: "revenue", periodDays: "periodDays" } },
  ],
  questions: [
    { en: "Which lease, permit or licence covers your site, and when does it end?", bn: "কোন ইজারা, পারমিট বা লাইসেন্সে আপনার সাইট চলে, আর কবে শেষ হয়?" },
    { en: "How do you move the material, and what happens when roads are closed?", bn: "মাল কীভাবে সরান, আর রাস্তা বন্ধ থাকলে কী করেন?" },
    { en: "Who are your regular buyers, and how long do they take to pay?", bn: "নিয়মিত ক্রেতা কারা, আর পে করতে কত সময় নেয়?" },
    { en: "What does the work do to land, water and neighbours, and how do you handle it?", bn: "কাজে জমি, পানি ও প্রতিবেশীর ওপর কী প্রভাব পড়ে, আর কীভাবে সামলান?" },
  ],
  risks: [
    { en: "Permit or lease is cancelled or not renewed.", bn: "পারমিট বা ইজারা বাতিল হয় বা নবায়ন হয় না।" },
    { en: "Rain and floods stop digging and delivery.", bn: "বৃষ্টি ও বন্যায় তোলা ও ডেলিভারি বন্ধ হয়।" },
    { en: "Fuel and transport prices change.", bn: "জ্বালানি ও পরিবহনের দাম বদলায়।" },
    { en: "Accidents and injuries on site.", bn: "সাইটে দুর্ঘটনা ও আঘাত।" },
    { en: "Environmental rules and local complaints.", bn: "পরিবেশের নিয়ম ও স্থানীয় অভিযোগ।" },
  ],
  seasonal: true,
  related: { paths: [], halalCheck: true },
};
