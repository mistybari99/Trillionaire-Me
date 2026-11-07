// Energy, utilities and solar. Data only. No numbers, no benchmarks. See docs/design/sector-model.md.
import type { SectorFamily } from "../types";

export const energyUtilitiesSolar: SectorFamily = {
  id: "energy-utilities-solar",
  name: { en: "Energy, utilities and solar", bn: "এনার্জি, ইউটিলিটি ও সোলার" },
  summary: {
    en: "Sells or runs power, water or waste services, such as solar installation, generator rental, water supply or waste collection. Install cost, output, losses and late payments decide the result.",
    bn: "বিদ্যুৎ, পানি বা বর্জ্যের সেবা দেয়, যেমন সোলার বসানো, জেনারেটর ভাড়া, পানি সরবরাহ বা বর্জ্য সংগ্রহ। বসানোর খরচ, আউটপুট, লস আর বকেয়া আদায়ের ওপর ফলাফল নির্ভর করে।",
  },
  aliases: {
    en: ["solar", "solar panel", "generator", "ips", "water supply", "waste collection", "electricity", "power plant", "irrigation pump", "biogas"],
    bn: ["সোলার", "সোলার প্যানেল", "জেনারেটর", "আইপিএস", "পানি সরবরাহ", "বর্জ্য সংগ্রহ", "বিদ্যুৎ", "বায়োগ্যাস"],
  },
  inputs: [
    { id: "price", label: { en: "Price you charge per unit sold (unit of power, water or one pickup)", bn: "প্রতি ইউনিট বিক্রির দাম (বিদ্যুৎ, পানি বা একবার সংগ্রহ)" }, unit: "money", perPeriod: false, required: true },
    { id: "varCost", label: { en: "Running cost per unit sold (fuel, parts, power bought)", bn: "প্রতি ইউনিটের চলতি খরচ (জ্বালানি, পার্টস, কেনা বিদ্যুৎ)" }, unit: "money", perPeriod: false, required: true },
    { id: "fixed", label: { en: "Fixed costs for the month (staff, rent, licence, loan instalment)", bn: "মাসের ফিক্সড খরচ (স্টাফ, ভাড়া, লাইসেন্স, ঋণের কিস্তি)" }, unit: "money", perPeriod: true, required: true },
    { id: "revenue", label: { en: "Billed or sold amount for the month", bn: "মাসে বিল করা বা বিক্রির মোট টাকা" }, unit: "money", perPeriod: true },
    { id: "investment", label: { en: "Money spent to set up the plant, panels or network", bn: "প্ল্যান্ট, প্যানেল বা নেটওয়ার্ক বসাতে মোট খরচ" }, unit: "money", perPeriod: false },
    { id: "monthlyProfit", label: { en: "Profit you keep in a month from this setup", bn: "এই সেটআপ থেকে মাসে হাতে থাকা মুনাফা" }, unit: "money", perPeriod: true },
    { id: "produced", label: { en: "Output made in the month (power, water or waste handled)", bn: "মাসে তৈরি আউটপুট (বিদ্যুৎ, পানি বা সামলানো বর্জ্য)" }, unit: "qty", perPeriod: true },
    { id: "capacityQty", label: { en: "Output the setup could make in the month at full use", bn: "পুরো ব্যবহারে মাসে যতটা আউটপুট সম্ভব" }, unit: "qty", perPeriod: true },
    { id: "delivered", label: { en: "Amount that reached customers (same unit as made)", bn: "গ্রাহকের কাছে যতটা পৌঁছেছে (একই ইউনিটে)" }, unit: "qty", perPeriod: true },
    { id: "receivables", label: { en: "Bills not yet paid by customers", bn: "গ্রাহকের কাছে বকেয়া বিল" }, unit: "money", perPeriod: false },
    { id: "periodDays", label: { en: "Days in the period you are looking at", bn: "যে সময়ের হিসাব দেখছেন তার দিন সংখ্যা" }, unit: "days", perPeriod: true },
  ],
  formulas: [
    { id: "unitMargin", use: "contributionMargin", map: { price: "price", varCost: "varCost" } },
    { id: "breakEvenUnits", use: "breakEvenUnits", map: { fixed: "fixed", price: "price", varCost: "varCost" } },
    { id: "setupPayback", use: "payback", map: { investment: "investment", profitPerPeriod: "monthlyProfit" }, name: { en: "Months to earn back the set-up cost", bn: "সেটআপ খরচ ফিরতে কত মাস" } },
    { id: "plantUse", use: "capacityUtilisation", map: { used: "produced", capacity: "capacityQty" }, name: { en: "How much of the capacity is used", bn: "ক্যাপাসিটির কতটা ব্যবহার হচ্ছে" } },
    { id: "lineLoss", use: "lossRate", map: { outputQty: "delivered", inputQty: "produced" }, name: { en: "Loss before reaching customers", bn: "গ্রাহকের কাছে পৌঁছানোর আগে লস" } },
    { id: "billCollectionDays", use: "receivableDays", map: { receivables: "receivables", revenue: "revenue", periodDays: "periodDays" } },
    { id: "monthProfit", name: { en: "Profit for the month (own expression)", bn: "মাসের মুনাফা (নিজের লেখা এক্সপ্রেশন)" }, expr: "revenue - fixed", needs: ["revenue", "fixed"], result: "money" },
  ],
  questions: [
    { en: "Which licence, grid connection or permission do you need, and who gives it?", bn: "কোন লাইসেন্স, গ্রিড সংযোগ বা অনুমতি লাগে, আর কে দেয়?" },
    { en: "Who services the equipment, and what happens to customers while it is down?", bn: "যন্ত্রপাতির সার্ভিস কে করে, আর বন্ধ থাকলে গ্রাহকের কী হয়?" },
    { en: "How do customers pay, and how do you follow up late bills?", bn: "গ্রাহক কীভাবে পে করে, আর বকেয়া বিল কীভাবে ফলো-আপ করেন?" },
    { en: "Does output change with weather or season, and do you have a backup?", bn: "আবহাওয়া বা মৌসুমে আউটপুট বদলায় কি না, আর ব্যাকআপ আছে কি?" },
  ],
  risks: [
    { en: "Equipment fails or wears out sooner than planned.", bn: "যন্ত্রপাতি পরিকল্পনার আগেই নষ্ট বা ক্ষয় হয়ে যেতে পারে।" },
    { en: "Fuel or imported part prices change.", bn: "জ্বালানি বা আমদানি করা পার্টসের দাম বদলায়।" },
    { en: "Customers pay late, so cash is stuck in bills.", bn: "গ্রাহক দেরিতে পে করে, ফলে টাকা বিলে আটকে থাকে।" },
    { en: "Rules, tariffs or grid policy change.", bn: "নিয়ম, ট্যারিফ বা গ্রিডের নীতি বদলায়।" },
    { en: "Safety incidents, such as fire, shock or leaks.", bn: "নিরাপত্তার ঘটনা, যেমন আগুন, শক বা লিক।" },
  ],
  seasonal: true,
  related: { paths: [], halalCheck: true },
};
