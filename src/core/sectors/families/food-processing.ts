// Food processing (rice mill, flour, spices, pickles, dairy products, bakery production). Data only. No numbers, no benchmarks. See docs/design/sector-model.md.
import type { SectorFamily } from "../types";

export const foodProcessing: SectorFamily = {
  id: "food-processing",
  name: { en: "Food processing (mill, spices, dairy products, bakery production)", bn: "ফুড প্রসেসিং (মিল, মসলা, দুগ্ধজাত পণ্য, বেকারি উৎপাদন)" },
  summary: {
    en: "Turns raw farm produce into packed or milled food. How much usable product comes out of the raw input, shelf life and storage decide the result.",
    bn: "কাঁচা কৃষিপণ্য থেকে প্যাকেট বা মিলের খাবার বানায়। কাঁচামাল থেকে কতটা ব্যবহারযোগ্য পণ্য পাওয়া যায়, মেয়াদ আর সংরক্ষণের ওপর ফলাফল নির্ভর করে।",
  },
  aliases: {
    en: ["rice mill", "flour mill", "spice grinding", "pickle maker", "dairy products", "bakery production", "food factory", "packaged food", "oil mill", "processing"],
    bn: ["চালকল", "আটাকল", "মসলা", "আচার", "দুগ্ধজাত", "বেকারি", "খাবারের কারখানা", "তেল মিল"],
  },
  inputs: [
    { id: "price", label: { en: "Selling price of one unit of product (kg, pack, litre)", bn: "এক ইউনিট পণ্যের (কেজি, প্যাকেট, লিটার) বিক্রির দাম" }, unit: "money", perPeriod: false, required: true },
    { id: "varCost", label: { en: "Raw material, packing and power cost of one unit", bn: "এক ইউনিটের কাঁচামাল, প্যাকিং ও বিদ্যুতের খরচ" }, unit: "money", perPeriod: false, required: true },
    { id: "fixed", label: { en: "Fixed costs for the month (rent, salaries, licence, loan instalment)", bn: "মাসের ফিক্সড খরচ (ভাড়া, বেতন, লাইসেন্স, ঋণের কিস্তি)" }, unit: "money", perPeriod: true, required: true },
    { id: "revenue", label: { en: "Sales for the period", bn: "সময়ের মোট বিক্রি" }, unit: "money", perPeriod: true },
    { id: "cogs", label: { en: "Cost of goods sold in the period", bn: "সময়ে বিক্রি হওয়া মালের খরচ" }, unit: "money", perPeriod: true },
    { id: "rawStock", label: { en: "Value of raw material and finished stock now", bn: "কাঁচামাল ও তৈরি মালের এখনকার দাম" }, unit: "money", perPeriod: false },
    { id: "receivables", label: { en: "Unpaid amount from buyers now", bn: "ক্রেতার কাছে এখন বাকি পাওনা" }, unit: "money", perPeriod: false },
    { id: "periodDays", label: { en: "Days in the period", bn: "সময়ের দিন সংখ্যা" }, unit: "days", perPeriod: false },
    { id: "inputQty", label: { en: "Raw material put into processing", bn: "প্রসেসিংয়ে দেওয়া কাঁচামাল" }, unit: "qty", perPeriod: true },
    { id: "outputQty", label: { en: "Usable product that came out (same unit)", bn: "যে ব্যবহারযোগ্য পণ্য পাওয়া গেছে (একই ইউনিটে)" }, unit: "qty", perPeriod: true },
    { id: "spoiledQty", label: { en: "Product spoiled, expired or returned", bn: "নষ্ট, মেয়াদ শেষ বা ফেরত আসা পণ্য" }, unit: "qty", perPeriod: true },
    { id: "madeQty", label: { en: "All product made (same unit as spoiled)", bn: "মোট বানানো পণ্য (নষ্টের একই ইউনিটে)" }, unit: "qty", perPeriod: true },
    { id: "capacityQty", label: { en: "Raw material the plant could process in the period", bn: "সময়ে প্ল্যান্টে মোট যত কাঁচামাল প্রসেস করা সম্ভব ছিল" }, unit: "qty", perPeriod: true },
  ],
  formulas: [
    { id: "unitMargin", use: "contributionMargin", map: { price: "price", varCost: "varCost" } },
    { id: "unitMarginPct", use: "contributionMarginPct", map: { price: "price", varCost: "varCost" } },
    { id: "breakEvenUnits", use: "breakEvenUnits", map: { fixed: "fixed", price: "price", varCost: "varCost" } },
    { id: "grossMargin", use: "grossMargin", map: { revenue: "revenue", cogs: "cogs" } },
    { id: "yieldRate", use: "yieldRate", map: { outputQty: "outputQty", inputQty: "inputQty" } },
    { id: "plantUse", use: "capacityUtilisation", map: { used: "inputQty", capacity: "capacityQty" } },
    { id: "spoilPct", use: "shareOfQty", map: { partQty: "spoiledQty", wholeQty: "madeQty" }, name: { en: "Spoiled or returned (percent of product made)", bn: "নষ্ট বা ফেরত (বানানো পণ্যের শতাংশ)" } },
    { id: "stockDays", use: "inventoryDays", map: { inventory: "rawStock", cogs: "cogs", periodDays: "periodDays" } },
    { id: "receivableDays", use: "receivableDays", map: { receivables: "receivables", revenue: "revenue", periodDays: "periodDays" } },
  ],
  questions: [
    { en: "How much usable product do you get from each lot of raw material, and does it change by supplier?", bn: "প্রতি লট কাঁচামাল থেকে কতটা ব্যবহারযোগ্য পণ্য পান, আর সাপ্লায়ার বদলালে কি বদলায়?" },
    { en: "How long can your product be stored before it spoils?", bn: "আপনার পণ্য নষ্ট হওয়ার আগে কতদিন রাখা যায়?" },
    { en: "Which food licence, lab test and label rules apply to you?", bn: "আপনার জন্য কোন ফুড লাইসেন্স, ল্যাব টেস্ট ও লেবেলের নিয়ম প্রযোজ্য?" },
    { en: "Do you buy raw material in the harvest season and store it?", bn: "ফসলের মৌসুমে কি কাঁচামাল কিনে মজুত রাখেন?" },
  ],
  risks: [
    { en: "Raw material price swings with the harvest.", bn: "ফসলের সাথে কাঁচামালের দাম ওঠানামা করে।" },
    { en: "Spoilage, pests and damp in storage.", bn: "মজুতে পচন, পোকা ও স্যাঁতসেঁতে ভাব।" },
    { en: "Food safety failure can stop sales and harm customers.", bn: "খাদ্য নিরাপত্তায় ভুল হলে বিক্রি বন্ধ হতে পারে এবং ক্রেতার ক্ষতি হয়।" },
    { en: "Power cuts stop machines and cold storage.", bn: "বিদ্যুৎ না থাকলে মেশিন ও কোল্ড স্টোরেজ বন্ধ হয়।" },
  ],
  seasonal: true,
  related: { paths: ["business-starter"], halalCheck: true },
};
