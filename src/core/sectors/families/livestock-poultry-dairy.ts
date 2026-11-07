// Livestock, poultry and dairy. Data only. No numbers, no benchmarks. See docs/design/sector-model.md.
import type { SectorFamily } from "../types";

export const livestockPoultryDairy: SectorFamily = {
  id: "livestock-poultry-dairy",
  name: { en: "Livestock, poultry and dairy", bn: "গবাদিপশু, পোল্ট্রি ও ডেইরি" },
  summary: {
    en: "Raises cattle, goats, poultry or dairy animals for milk, eggs or meat. Feed cost, animal loss and output per animal decide the result.",
    bn: "গরু, ছাগল, মুরগি বা দুধেল পশু পালন করে দুধ, ডিম বা মাংস বিক্রি। ফিডের খরচ, পশুর লস আর পশু-প্রতি আউটপুটের ওপর ফলাফল নির্ভর করে।",
  },
  aliases: {
    en: ["dairy", "poultry", "cattle", "goat farm", "layer farm", "broiler", "egg farm", "cow farm", "milk"],
    bn: ["ডেইরি ফার্ম", "পোল্ট্রি ফার্ম", "গরুর খামার", "ছাগলের খামার", "মুরগির খামার", "ডিমের খামার", "দুধ"],
  },
  inputs: [
    { id: "price", label: { en: "Selling price of one unit (litre, egg, kg or animal)", bn: "এক ইউনিটের বিক্রির দাম (লিটার, ডিম, কেজি বা পশু)" }, unit: "money", perPeriod: false, required: true },
    { id: "varCost", label: { en: "Feed and care cost for one unit sold", bn: "এক ইউনিট বিক্রির পেছনে ফিড ও পরিচর্যার খরচ" }, unit: "money", perPeriod: false, required: true },
    { id: "fixed", label: { en: "Fixed costs for the period (shed rent, labour, licence)", bn: "পিরিয়ডের ফিক্সড খরচ (শেডের ভাড়া, লেবার, লাইসেন্স)" }, unit: "money", perPeriod: true, required: true },
    { id: "revenue", label: { en: "Sales for the period", bn: "পিরিয়ডের মোট বিক্রি" }, unit: "money", perPeriod: true },
    { id: "feedCost", label: { en: "Feed bought for the period", bn: "পিরিয়ডে কেনা ফিড" }, unit: "money", perPeriod: true },
    { id: "vetCost", label: { en: "Vet, medicine and vaccine cost for the period", bn: "পিরিয়ডের ভেট, ওষুধ ও ভ্যাকসিনের খরচ" }, unit: "money", perPeriod: true },
    { id: "animalsStart", label: { en: "Animals or birds at the start of the period", bn: "পিরিয়ড শুরুতে পশু বা পাখির সংখ্যা" }, unit: "qty", perPeriod: true },
    { id: "animalsLost", label: { en: "Animals or birds that died or were culled", bn: "যে পশু বা পাখি মারা গেছে বা বাদ দেওয়া হয়েছে" }, unit: "qty", perPeriod: true },
    { id: "outputQty", label: { en: "Milk, eggs or meat produced (one unit type)", bn: "উৎপাদিত দুধ, ডিম বা মাংস (একই ইউনিটে)" }, unit: "qty", perPeriod: true },
    { id: "feedQty", label: { en: "Feed given (weight)", bn: "দেওয়া ফিডের ওজন" }, unit: "qty", perPeriod: true },
    { id: "receivables", label: { en: "Money buyers still owe you", bn: "ক্রেতার কাছে বাকি পাওনা" }, unit: "money", perPeriod: false },
    { id: "periodDays", label: { en: "Days in the period", bn: "পিরিয়ডের দিন" }, unit: "days", perPeriod: true },
  ],
  formulas: [
    { id: "unitMargin", use: "contributionMargin", map: { price: "price", varCost: "varCost" } },
    { id: "breakEvenUnits", use: "breakEvenUnits", map: { fixed: "fixed", price: "price", varCost: "varCost" } },
    { id: "feedShare", use: "shareOfMoney", map: { part: "feedCost", whole: "revenue" }, name: { en: "Feed cost (percent of sales)", bn: "ফিডের খরচ (বিক্রির শতাংশ)" } },
    { id: "vetShare", use: "shareOfMoney", map: { part: "vetCost", whole: "revenue" }, name: { en: "Vet and medicine cost (percent of sales)", bn: "ভেট ও ওষুধের খরচ (বিক্রির শতাংশ)" } },
    { id: "mortality", use: "shareOfQty", map: { partQty: "animalsLost", wholeQty: "animalsStart" }, name: { en: "Animals lost (percent of start)", bn: "পশু লস (শুরুর সংখ্যার শতাংশ)" } },
    { id: "feedConversion", name: { en: "Feed given per unit of output", bn: "প্রতি ইউনিট আউটপুটে ফিড" }, expr: "feedQty / outputQty", needs: ["feedQty", "outputQty"], result: "ratio" },
    { id: "periodProfit", name: { en: "Profit for the period (own expression)", bn: "পিরিয়ডের মুনাফা (নিজের লেখা এক্সপ্রেশন)" }, expr: "revenue - feedCost - vetCost - fixed", needs: ["revenue", "feedCost", "vetCost", "fixed"], result: "money" },
    { id: "receivableDays", use: "receivableDays", map: { receivables: "receivables", revenue: "revenue", periodDays: "periodDays" } },
  ],
  questions: [
    { en: "How much of your feed do you buy ahead, and can you store it dry?", bn: "ফিড কতটা আগে কিনে রাখেন, আর শুকনো জায়গায় রাখার ব্যবস্থা আছে কি?" },
    { en: "Who is your vet, and how fast can they reach you in an outbreak?", bn: "আপনার ভেট কে, আর রোগ ছড়ালে কত তাড়াতাড়ি আসতে পারেন?" },
    { en: "Do you sell to a regular buyer, or to whoever comes on the day?", bn: "নিয়মিত ক্রেতার কাছে বেচেন, নাকি যেদিন যে আসে তার কাছে?" },
    { en: "How do you keep milk or eggs fresh until they are sold?", bn: "দুধ বা ডিম বিক্রির আগে টাটকা রাখেন কীভাবে?" },
  ],
  risks: [
    { en: "Disease can spread through the whole flock or herd.", bn: "রোগ পুরো ফ্লক বা পালে ছড়িয়ে যেতে পারে।" },
    { en: "Feed prices change while selling prices stay slow to move.", bn: "ফিডের দাম বদলায়, কিন্তু বিক্রির দাম সহজে বদলায় না।" },
    { en: "Milk and eggs spoil fast without cold storage or power.", bn: "কোল্ড স্টোরেজ বা বিদ্যুৎ না থাকলে দুধ ও ডিম দ্রুত নষ্ট হয়।" },
    { en: "Floods, heat or cold can harm the animals.", bn: "বন্যা, গরম বা ঠান্ডায় পশুর ক্ষতি হতে পারে।" },
  ],
  seasonal: true,
  related: { paths: [], halalCheck: true },
};
