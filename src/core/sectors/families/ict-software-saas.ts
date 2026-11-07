// ICT, software and SaaS. Data only. No numbers, no benchmarks. See docs/design/sector-model.md.
import type { SectorFamily } from "../types";

export const ictSoftwareSaas: SectorFamily = {
  id: "ict-software-saas",
  name: { en: "Software, IT services and SaaS", bn: "সফটওয়্যার, আইটি সার্ভিস ও সাবস্ক্রিপশন অ্যাপ" },
  summary: {
    en: "Builds software, sells subscriptions or does IT work for clients. Customers who stay, team cost and hosting cost decide the result.",
    bn: "সফটওয়্যার বানানো, সাবস্ক্রিপশন বিক্রি বা ক্লায়েন্টের আইটি কাজ। কাস্টমার থেকে যায় কি না, টিমের খরচ আর হোস্টিং খরচের ওপর ফলাফল নির্ভর করে।",
  },
  aliases: {
    en: ["software house", "saas", "it services", "app development", "web hosting", "web development", "startup", "subscription", "outsourcing"],
    bn: ["সফটওয়্যার হাউস", "আইটি সার্ভিস", "অ্যাপ ডেভেলপমেন্ট", "ওয়েব ডেভেলপমেন্ট", "হোস্টিং", "স্টার্টআপ", "সাবস্ক্রিপশন"],
  },
  inputs: [
    { id: "price", label: { en: "Subscription or fee per customer for the month", bn: "প্রতি কাস্টমারের মাসের সাবস্ক্রিপশন বা ফি" }, unit: "money", perPeriod: false, required: true },
    { id: "varCost", label: { en: "Cost to serve one customer (hosting, support, gateway)", bn: "একজন কাস্টমারকে সার্ভ করার খরচ (হোস্টিং, সাপোর্ট, গেটওয়ে)" }, unit: "money", perPeriod: false, required: true },
    { id: "marginPerCustomer", label: { en: "What you keep from one customer each month, after serving cost", bn: "সার্ভ করার খরচের পর প্রতি মাসে একজন কাস্টমার থেকে যা থাকে" }, unit: "money", perPeriod: false },
    { id: "fixed", label: { en: "Fixed costs for the month (team pay, tools, office)", bn: "মাসের ফিক্সড খরচ (টিমের বেতন, টুলস, অফিস)" }, unit: "money", perPeriod: true, required: true },
    { id: "revenue", label: { en: "Income for the month", bn: "মাসের মোট আয়" }, unit: "money", perPeriod: true },
    { id: "hostingCost", label: { en: "Hosting and cloud cost for the month", bn: "মাসের হোস্টিং ও ক্লাউড খরচ" }, unit: "money", perPeriod: true },
    { id: "teamCost", label: { en: "Team pay for the month", bn: "মাসের টিমের বেতন" }, unit: "money", perPeriod: true },
    { id: "churnPct", label: { en: "Customers lost in the month (percent of all)", bn: "মাসে হারানো কাস্টমার (মোটের শতাংশ)" }, unit: "percent", perPeriod: true },
    { id: "marketingSpend", label: { en: "Marketing and sales spend for the month", bn: "মাসের মার্কেটিং ও সেলস খরচ" }, unit: "money", perPeriod: true },
    { id: "newCustomers", label: { en: "New customers won in the month", bn: "মাসে পাওয়া নতুন কাস্টমার" }, unit: "count", perPeriod: true },
    { id: "hoursBilled", label: { en: "Hours billed to clients", bn: "ক্লায়েন্টকে বিল করা ঘণ্টা" }, unit: "qty", perPeriod: true },
    { id: "hoursAvailable", label: { en: "Hours your team could work", bn: "টিম মোট যত ঘণ্টা কাজ করতে পারত" }, unit: "qty", perPeriod: true },
    { id: "invested", label: { en: "Money put into building the product", bn: "প্রোডাক্ট বানাতে লাগানো টাকা" }, unit: "money", perPeriod: false },
    { id: "monthlyProfit", label: { en: "Profit you keep each month from it", bn: "প্রতি মাসে এ থেকে আপনার থাকা মুনাফা" }, unit: "money", perPeriod: true },
  ],
  formulas: [
    { id: "customerMargin", use: "contributionMargin", map: { price: "price", varCost: "varCost" } },
    { id: "breakEvenCustomers", use: "breakEvenUnits", map: { fixed: "fixed", price: "price", varCost: "varCost" } },
    { id: "customerCost", use: "cac", map: { marketingSpend: "marketingSpend", newCustomers: "newCustomers" } },
    { id: "customerLife", use: "ltv", map: { marginPerPeriod: "marginPerCustomer", churnPct: "churnPct" } },
    { id: "teamUse", use: "capacityUtilisation", map: { used: "hoursBilled", capacity: "hoursAvailable" }, name: { en: "Team hours billed (percent)", bn: "বিল হওয়া টিম-ঘণ্টা (শতাংশ)" } },
    { id: "hostingShare", use: "shareOfMoney", map: { part: "hostingCost", whole: "revenue" }, name: { en: "Hosting cost (percent of income)", bn: "হোস্টিং খরচ (আয়ের শতাংশ)" } },
    { id: "paybackMonths", use: "payback", map: { investment: "invested", profitPerPeriod: "monthlyProfit" }, name: { en: "Months to get the money back", bn: "টাকা ফেরত পেতে মাস" } },
    { id: "monthProfit", name: { en: "Profit for the month", bn: "মাসের মুনাফা" }, expr: "revenue - hostingCost - teamCost - marketingSpend", needs: ["revenue", "hostingCost", "teamCost", "marketingSpend"], result: "money" },
  ],
  questions: [
    { en: "Why do customers leave, and when in their first months?", bn: "কাস্টমার কেন ছেড়ে যায়, আর শুরুর কোন সময়ে?" },
    { en: "Does your income come from a few big clients or many small ones?", bn: "আয় কি কয়েকটা বড় ক্লায়েন্ট থেকে, না অনেক ছোট ক্লায়েন্ট থেকে?" },
    { en: "Who owns the code and the customer data, and is it backed up?", bn: "কোড আর কাস্টমারের ডাটার মালিক কে, আর ব্যাকআপ আছে কি না?" },
    { en: "Which payment gateway or licence rules apply to you?", bn: "কোন পেমেন্ট গেটওয়ে বা লাইসেন্সের নিয়ম আপনার জন্য প্রযোজ্য?" },
  ],
  risks: [
    { en: "One large client leaves and income drops.", bn: "একটা বড় ক্লায়েন্ট চলে গেলে আয় কমে যায়।" },
    { en: "Key developers leave with the know-how.", bn: "মূল ডেভেলপাররা জানা-বোঝা নিয়ে চলে যায়।" },
    { en: "Outage, data loss or a security breach.", bn: "সার্ভার বন্ধ, ডাটা হারানো বা সিকিউরিটি ভাঙা।" },
    { en: "Foreign currency and cloud prices change your costs.", bn: "বিদেশি মুদ্রা ও ক্লাউডের দাম বদলালে খরচ বদলে যায়।" },
    { en: "Projects grow beyond the agreed scope without extra pay.", bn: "অতিরিক্ত টাকা ছাড়াই প্রজেক্ট চুক্তির বাইরে বেড়ে যায়।" },
  ],
  seasonal: false,
  related: { paths: [], halalCheck: true },
};
