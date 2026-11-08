// Worked example 1 (template for writers): Retail. Data only. No numbers, no benchmarks. See docs/design/sector-model.md.
import type { SectorFamily } from "../types";

export const retail: SectorFamily = {
  id: "retail",
  name: { en: "Retail shop", bn: "খুচরা দোকান" },
  summary: {
    en: "Sells goods to customers from a shop or stall. Margin, stock days and break-even matter most.",
    bn: "দোকান বা স্টলে কাস্টমারের কাছে মাল বিক্রি। মার্জিন, স্টক কত দিন পড়ে থাকে আর ব্রেক-ইভেন সবচেয়ে জরুরি।",
  },
  aliases: {
    en: ["retail", "shop", "store", "grocery", "kiosk", "stall", "mini mart", "general store"],
    bn: ["খুচরা", "দোকান", "মুদি", "স্টল", "মিনি মার্ট", "স্টোর"],
  },
  inputs: [
    { id: "price", label: { en: "Average selling price per item", bn: "প্রতি আইটেমের গড় বিক্রির দাম" }, unit: "money", perPeriod: false, required: true },
    { id: "varCost", label: { en: "Average buying cost per item", bn: "প্রতি আইটেমের গড় কেনা দাম" }, unit: "money", perPeriod: false, required: true },
    { id: "fixed", label: { en: "Fixed costs for the month (rent, staff pay, power)", bn: "মাসের ফিক্সড খরচ (ভাড়া, স্টাফের বেতন, বিদ্যুৎ)" }, unit: "money", perPeriod: true, required: true },
    { id: "revenue", label: { en: "Sales for the month", bn: "মাসের মোট বিক্রি" }, unit: "money", perPeriod: true },
    { id: "cogs", label: { en: "Cost of the goods sold in the month", bn: "মাসে যে মাল বিক্রি হয়েছে তার কেনা খরচ" }, unit: "money", perPeriod: true },
    { id: "inventory", label: { en: "Stock on the shelf, at buying cost", bn: "তাকে থাকা স্টক, কেনা দামে" }, unit: "money", perPeriod: false },
    { id: "receivables", label: { en: "Money customers still owe you (credit sales)", bn: "কাস্টমারের কাছে বাকি পাওনা (বাকিতে বিক্রি)" }, unit: "money", perPeriod: false },
    { id: "payables", label: { en: "Money you still owe suppliers", bn: "সাপ্লায়ারকে বাকি দেনা" }, unit: "money", perPeriod: false },
    { id: "periodDays", label: { en: "Days in the month you are counting", bn: "যে মাসের হিসাব করছেন তার দিন সংখ্যা" }, unit: "days", perPeriod: true, hint: { en: "Count the days you were open or the calendar days, and use the same each time.", bn: "খোলা দিন বা ক্যালেন্ডারের দিন গুনুন, প্রতিবার একই নিয়ম রাখুন।" } },
    { id: "shelfSpace", label: { en: "Shelf or display space (units you choose)", bn: "তাক বা ডিসপ্লের জায়গা (যে ইউনিটে মাপেন)" }, unit: "qty", perPeriod: false },
  ],
  formulas: [
    { id: "unitMargin", use: "contributionMargin", map: { price: "price", varCost: "varCost" } },
    { id: "marginPct", use: "contributionMarginPct", map: { price: "price", varCost: "varCost" } },
    { id: "grossMarginMonth", use: "grossMargin", map: { revenue: "revenue", cogs: "cogs" } },
    { id: "breakEvenItems", use: "breakEvenUnits", map: { fixed: "fixed", price: "price", varCost: "varCost" } },
    { id: "breakEvenSales", use: "breakEvenRevenue", map: { fixed: "fixed", price: "price", varCost: "varCost" } },
    { id: "stockDays", use: "inventoryDays", map: { inventory: "inventory", cogs: "cogs", periodDays: "periodDays" } },
    { id: "cashDays", use: "cashConversion", map: { receivables: "receivables", inventory: "inventory", payables: "payables", revenue: "revenue", cogs: "cogs", periodDays: "periodDays" } },
    { id: "salesPerSpace", use: "revenuePerCapacity", map: { revenue: "revenue", capacityUnits: "shelfSpace" } },
  ],
  questions: [
    { en: "Which items bring most of your sales, and which sit unsold the longest?", bn: "কোন আইটেম থেকে বেশির ভাগ বিক্রি হয়, আর কোনটা সবচেয়ে বেশি দিন পড়ে থাকে?" },
    { en: "How much do you sell on credit, and how long do customers take to pay?", bn: "কতটা বাকিতে বিক্রি করেন, আর কাস্টমার কত দিনে টাকা দেয়?" },
    { en: "Do you count stock regularly, or only when it is short?", bn: "স্টক কি নিয়মিত গুনে দেখেন, নাকি কম পড়লে তখন?" },
    { en: "Which costs stay the same every month even if sales are slow?", bn: "বিক্রি কম হলেও কোন খরচ প্রতি মাসে একই থাকে?" },
  ],
  risks: [
    { en: "Too much money tied up in slow stock.", bn: "ধীরে বিক্রি হওয়া স্টকে অনেক টাকা আটকে থাকা।" },
    { en: "Credit sales that are not paid back on time.", bn: "বাকিতে বিক্রির টাকা সময়মতো না ফেরা।" },
    { en: "Damaged, expired or stolen goods that are not written down.", bn: "নষ্ট, মেয়াদ শেষ বা চুরি হওয়া মাল খাতায় না তোলা।" },
    { en: "A busy season followed by a long quiet one.", bn: "ব্যস্ত সিজনের পর লম্বা মন্দা সময়।" },
  ],
  seasonal: true,
  related: { paths: ["business-starter"], halalCheck: true },
};
