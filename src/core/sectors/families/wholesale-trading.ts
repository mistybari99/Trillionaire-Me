// Wholesale and trading (aratdar, dealer, distributor, commodity trader). Data only. No numbers, no benchmarks. See docs/design/sector-model.md.
import type { SectorFamily } from "../types";

export const wholesaleTrading: SectorFamily = {
  id: "wholesale-trading",
  name: { en: "Wholesale and trading (aratdar, dealer, distributor)", bn: "পাইকারি ও ট্রেডিং (আড়তদার, ডিলার, ডিস্ট্রিবিউটর)" },
  summary: {
    en: "Buys in bulk and sells to shops or other traders. Credit given to buyers, stock held and the gap between buy and sell price decide the result.",
    bn: "বেশি পরিমাণে কিনে দোকান বা অন্য ব্যবসায়ীর কাছে বিক্রি। বাকি দেওয়া, স্টকে আটকে থাকা টাকা আর কেনা-বেচার দামের ফারাকের ওপর ফলাফল নির্ভর করে।",
  },
  aliases: {
    en: ["wholesale", "aratdar", "dealer", "distributor", "trading", "commodity trader", "bulk seller", "supplier", "agent"],
    bn: ["পাইকারি", "আড়তদার", "ডিলার", "ডিস্ট্রিবিউটর", "ট্রেডিং", "আড়ত", "সাপ্লায়ার"],
  },
  inputs: [
    { id: "price", label: { en: "Selling price of one unit (bag, carton, kg)", bn: "এক ইউনিটের (বস্তা, কার্টন, কেজি) বিক্রির দাম" }, unit: "money", perPeriod: false, required: true },
    { id: "varCost", label: { en: "Buying and carrying cost of one unit", bn: "এক ইউনিটের কেনা ও পরিবহন খরচ" }, unit: "money", perPeriod: false, required: true },
    { id: "fixed", label: { en: "Fixed costs for the month (rent, staff, licence)", bn: "মাসের ফিক্সড খরচ (ভাড়া, স্টাফ, লাইসেন্স)" }, unit: "money", perPeriod: true, required: true },
    { id: "revenue", label: { en: "Sales for the period", bn: "সময়ের মোট বিক্রি" }, unit: "money", perPeriod: true },
    { id: "cogs", label: { en: "Cost of goods sold in the period", bn: "সময়ে বিক্রি হওয়া মালের কেনা খরচ" }, unit: "money", perPeriod: true },
    { id: "receivables", label: { en: "Credit sales not yet paid by buyers (due now)", bn: "ক্রেতার কাছে বাকি পাওনা (এখন)" }, unit: "money", perPeriod: false },
    { id: "inventory", label: { en: "Value of stock in the godown now", bn: "গুদামে এখনকার মজুত মালের দাম" }, unit: "money", perPeriod: false },
    { id: "payables", label: { en: "Amount you owe suppliers now", bn: "সাপ্লায়ারকে এখন যা দিতে হবে" }, unit: "money", perPeriod: false },
    { id: "periodDays", label: { en: "Days in the period", bn: "সময়ের দিন সংখ্যা" }, unit: "days", perPeriod: false },
    { id: "damagedQty", label: { en: "Goods damaged, spoiled or lost in the period", bn: "সময়ে নষ্ট, পচা বা হারানো মাল" }, unit: "qty", perPeriod: true },
    { id: "handledQty", label: { en: "All goods handled in the period (same unit)", bn: "সময়ে মোট সামলানো মাল (একই ইউনিটে)" }, unit: "qty", perPeriod: true },
  ],
  formulas: [
    { id: "unitMargin", use: "contributionMargin", map: { price: "price", varCost: "varCost" } },
    { id: "unitMarginPct", use: "contributionMarginPct", map: { price: "price", varCost: "varCost" } },
    { id: "breakEvenUnits", use: "breakEvenUnits", map: { fixed: "fixed", price: "price", varCost: "varCost" } },
    { id: "grossMargin", use: "grossMargin", map: { revenue: "revenue", cogs: "cogs" } },
    { id: "receivableDays", use: "receivableDays", map: { receivables: "receivables", revenue: "revenue", periodDays: "periodDays" } },
    { id: "inventoryDays", use: "inventoryDays", map: { inventory: "inventory", cogs: "cogs", periodDays: "periodDays" } },
    { id: "payableDays", use: "payableDays", map: { payables: "payables", cogs: "cogs", periodDays: "periodDays" } },
    { id: "cashCycle", use: "cashConversion", map: { receivables: "receivables", inventory: "inventory", payables: "payables", revenue: "revenue", cogs: "cogs", periodDays: "periodDays" } },
    { id: "lossPct", use: "shareOfQty", map: { partQty: "damagedQty", wholeQty: "handledQty" }, name: { en: "Damaged or lost goods (percent of goods handled)", bn: "নষ্ট বা হারানো মাল (সামলানো মালের শতাংশ)" } },
  ],
  questions: [
    { en: "Which buyers pay late, and how much of your money is stuck with them?", bn: "কোন ক্রেতারা দেরিতে দেয়, আর আপনার কত টাকা তাদের কাছে আটকে আছে?" },
    { en: "Which items move fast and which sit in the godown for long?", bn: "কোন আইটেম দ্রুত বিক্রি হয়, আর কোনটা গুদামে অনেক দিন পড়ে থাকে?" },
    { en: "Do you depend on one or two suppliers for most of your stock?", bn: "বেশির ভাগ মালের জন্য কি এক-দুইজন সাপ্লায়ারের ওপর নির্ভর করেন?" },
    { en: "Do you check scales, weights and counts when goods arrive and leave?", bn: "মাল আসা-যাওয়ার সময় ওজন ও সংখ্যা মিলিয়ে দেখেন কি না?" },
  ],
  risks: [
    { en: "Buyers delay payment or do not pay.", bn: "ক্রেতা দেরিতে বা একেবারেই টাকা দেয় না।" },
    { en: "Prices move between the day you buy and the day you sell.", bn: "কেনার দিন আর বেচার দিনের মধ্যে দাম বদলে যায়।" },
    { en: "Stock spoils, gets damaged or is stolen in the godown.", bn: "গুদামে মাল নষ্ট, ক্ষতিগ্রস্ত বা চুরি হয়।" },
    { en: "Too much money is tied up in stock and credit.", bn: "স্টক আর বাকিতে অনেক টাকা আটকে যায়।" },
  ],
  seasonal: true,
  related: { paths: ["business-starter"] },
};
