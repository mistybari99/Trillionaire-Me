// E-commerce and F-commerce. Data only. No numbers, no benchmarks. See docs/design/sector-model.md.
import type { SectorFamily } from "../types";

export const eCommerceFCommerce: SectorFamily = {
  id: "e-commerce-f-commerce",
  name: { en: "Online and Facebook shop", bn: "অনলাইন ও ফেসবুক শপ" },
  summary: {
    en: "Sells through a Facebook page, website or marketplace, often with cash on delivery and courier returns. Ad cost per customer and return losses matter most.",
    bn: "ফেসবুক পেজ, ওয়েবসাইট বা মার্কেটপ্লেসে বিক্রি, প্রায়ই ক্যাশ অন ডেলিভারি আর কুরিয়ার রিটার্ন সহ। কাস্টমার পেতে অ্যাডের খরচ আর রিটার্নের লস সবচেয়ে জরুরি।",
  },
  aliases: {
    en: ["online shop", "f-commerce", "facebook page", "facebook shop", "e-commerce", "cash on delivery", "cod", "marketplace seller", "daraz seller"],
    bn: ["অনলাইন শপ", "ফেসবুক পেজ", "এফ-কমার্স", "ক্যাশ অন ডেলিভারি", "দারাজ সেলার", "অনলাইন ব্যবসা"],
  },
  inputs: [
    { id: "price", label: { en: "Average selling price per order item", bn: "প্রতি আইটেমের গড় বিক্রির দাম" }, unit: "money", perPeriod: false, required: true },
    { id: "varCost", label: { en: "Buying cost plus packaging per item", bn: "প্রতি আইটেমের কেনা দাম আর প্যাকেজিং" }, unit: "money", perPeriod: false, required: true },
    { id: "fixed", label: { en: "Fixed costs for the month (staff, rent, tools)", bn: "মাসের ফিক্সড খরচ (স্টাফ, ভাড়া, টুলস)" }, unit: "money", perPeriod: true, required: true },
    { id: "adSpend", label: { en: "Ad spend for the month", bn: "মাসের অ্যাডের খরচ" }, unit: "money", perPeriod: true },
    { id: "newCustomers", label: { en: "New customers from ads and pages in the month", bn: "মাসে অ্যাড ও পেজ থেকে পাওয়া নতুন কাস্টমার" }, unit: "count", perPeriod: true },
    { id: "ordersSent", label: { en: "Orders handed to couriers in the month", bn: "মাসে কুরিয়ারকে দেওয়া অর্ডার" }, unit: "qty", perPeriod: true },
    { id: "ordersReturned", label: { en: "Orders returned or refused in the month", bn: "মাসে ফেরত আসা বা নেয়নি এমন অর্ডার" }, unit: "qty", perPeriod: true },
    { id: "revenue", label: { en: "Sales for the month", bn: "মাসের মোট বিক্রি" }, unit: "money", perPeriod: true },
    { id: "cogs", label: { en: "Cost of the goods sold in the month", bn: "মাসে বিক্রি হওয়া মালের কেনা খরচ" }, unit: "money", perPeriod: true },
    { id: "codPending", label: { en: "Cash on delivery money still held by couriers", bn: "কুরিয়ারের কাছে আটকে থাকা ক্যাশ অন ডেলিভারির টাকা" }, unit: "money", perPeriod: false },
    { id: "inventory", label: { en: "Stock in hand, at buying cost", bn: "হাতে থাকা স্টক, কেনা দামে" }, unit: "money", perPeriod: false },
    { id: "payables", label: { en: "Money you still owe suppliers", bn: "সাপ্লায়ারকে বাকি দেনা" }, unit: "money", perPeriod: false },
    { id: "periodDays", label: { en: "Days in the month you are counting", bn: "যে মাসের হিসাব করছেন তার দিন সংখ্যা" }, unit: "days", perPeriod: true },
  ],
  formulas: [
    { id: "unitMargin", use: "contributionMargin", map: { price: "price", varCost: "varCost" } },
    { id: "marginPct", use: "contributionMarginPct", map: { price: "price", varCost: "varCost" } },
    { id: "costPerCustomer", use: "cac", map: { marketingSpend: "adSpend", newCustomers: "newCustomers" } },
    { id: "returnRate", name: { en: "Return and refusal rate", bn: "রিটার্ন ও ফেরত নেওয়ার হার" }, use: "shareOfQty", map: { partQty: "ordersReturned", wholeQty: "ordersSent" } },
    { id: "breakEvenItems", use: "breakEvenUnits", map: { fixed: "fixed", price: "price", varCost: "varCost" } },
    { id: "codHeldDays", name: { en: "Days of sales held in cash on delivery", bn: "ক্যাশ অন ডেলিভারিতে আটকে থাকা বিক্রির দিন" }, use: "receivableDays", map: { receivables: "codPending", revenue: "revenue", periodDays: "periodDays" } },
    { id: "stockDays", use: "inventoryDays", map: { inventory: "inventory", cogs: "cogs", periodDays: "periodDays" } },
    { id: "monthProfit", name: { en: "Profit after goods, ads and fixed costs", bn: "মাল, অ্যাড ও ফিক্সড খরচের পর লাভ" }, expr: "revenue - cogs - adSpend - fixed", needs: ["revenue", "cogs", "adSpend", "fixed"], result: "money" },
  ],
  questions: [
    { en: "How much does it cost to win one new customer, and do they buy again?", bn: "একজন নতুন কাস্টমার পেতে কত খরচ হয়, আর তারা কি আবার কেনে?" },
    { en: "How many cash on delivery orders come back, and who pays the delivery both ways?", bn: "কত ক্যাশ অন ডেলিভারি অর্ডার ফেরত আসে, আর দুই দিকের ডেলিভারি খরচ কে দেয়?" },
    { en: "How long do couriers and marketplaces take to pay you?", bn: "কুরিয়ার আর মার্কেটপ্লেস কত দিনে আপনাকে টাকা দেয়?" },
    { en: "Do you depend on one page or one platform for most orders?", bn: "বেশির ভাগ অর্ডার কি একটা পেজ বা একটা প্ল্যাটফর্মের উপর নির্ভর করে?" },
  ],
  risks: [
    { en: "Returned orders that cost delivery and damaged goods.", bn: "ফেরত অর্ডারে ডেলিভারি খরচ আর নষ্ট মালের লস।" },
    { en: "Page or account blocked, so orders stop suddenly.", bn: "পেজ বা অ্যাকাউন্ট বন্ধ হয়ে হঠাৎ অর্ডার থেমে যাওয়া।" },
    { en: "Ad cost rising while orders stay the same.", bn: "অর্ডার একই থেকে অ্যাডের খরচ বেড়ে যাওয়া।" },
    { en: "Cash stuck with couriers or platforms for long.", bn: "কুরিয়ার বা প্ল্যাটফর্মের কাছে টাকা অনেক দিন আটকে থাকা।" },
    { en: "Selling goods that differ from the photos and costing reviews.", bn: "ছবির সাথে মাল না মেলায় রিভিউ নষ্ট হওয়া।" },
  ],
  seasonal: true,
  related: { paths: [], halalCheck: true },
};
