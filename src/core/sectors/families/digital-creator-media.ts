// Digital creator and media. Data only. No numbers, no benchmarks. See docs/design/sector-model.md.
import type { SectorFamily } from "../types";

export const digitalCreatorMedia: SectorFamily = {
  id: "digital-creator-media",
  name: { en: "Creator, media and studio", bn: "ক্রিয়েটর, মিডিয়া ও স্টুডিও" },
  summary: {
    en: "Earns from content, shoots, sponsors, ads or publishing. Income comes in uneven lumps, so spread and unpaid bills matter most.",
    bn: "কনটেন্ট, শুট, স্পনসর, অ্যাড বা পাবলিশিং থেকে আয়। আয় অসমানভাবে আসে, তাই মাসে মাসে ফারাক আর বাকি বিল সবচেয়ে জরুরি।",
  },
  aliases: {
    en: ["youtube", "content creator", "photographer", "videographer", "studio", "publisher", "influencer", "podcast", "blogger"],
    bn: ["ইউটিউব", "কনটেন্ট ক্রিয়েটর", "ফটোগ্রাফার", "স্টুডিও", "পাবলিশার", "ভিডিও", "ইনফ্লুয়েন্সার"],
  },
  inputs: [
    { id: "revenue", label: { en: "Income for the month (all sources)", bn: "মাসের মোট আয় (সব সোর্স)" }, unit: "money", perPeriod: true, required: true },
    { id: "sponsorIncome", label: { en: "Sponsor and brand deal income in the month", bn: "মাসে স্পনসর ও ব্র্যান্ড ডিল থেকে আয়" }, unit: "money", perPeriod: true },
    { id: "platformIncome", label: { en: "Platform and ad income in the month", bn: "মাসে প্ল্যাটফর্ম ও অ্যাড থেকে আয়" }, unit: "money", perPeriod: true },
    { id: "projectPrice", label: { en: "Price charged per project or shoot", bn: "প্রতি প্রজেক্ট বা শুটে নেওয়া দাম" }, unit: "money", perPeriod: false },
    { id: "projectCost", label: { en: "Direct cost per project (crew, travel, editing)", bn: "প্রতি প্রজেক্টের সরাসরি খরচ (ক্রু, যাতায়াত, এডিটিং)" }, unit: "money", perPeriod: false },
    { id: "fixed", label: { en: "Fixed costs for the month (rent, software, internet)", bn: "মাসের ফিক্সড খরচ (ভাড়া, সফটওয়্যার, ইন্টারনেট)" }, unit: "money", perPeriod: true, required: true },
    { id: "gearCost", label: { en: "Cost of cameras and gear you bought", bn: "কেনা ক্যামেরা ও গিয়ারের খরচ" }, unit: "money", perPeriod: false },
    { id: "monthlyProfit", label: { en: "Profit per month after all costs", bn: "সব খরচের পর মাসে লাভ" }, unit: "money", perPeriod: true },
    { id: "receivables", label: { en: "Bills you sent that are not yet paid", bn: "পাঠানো বিল যা এখনো পরিশোধ হয়নি" }, unit: "money", perPeriod: false },
    { id: "hoursUsed", label: { en: "Hours worked on paid and own content in the month", bn: "মাসে পেইড কাজ ও নিজের কনটেন্টে খাটা ঘণ্টা" }, unit: "qty", perPeriod: true },
    { id: "hoursAvailable", label: { en: "Hours you can work in the month", bn: "মাসে কাজ করতে পারেন এমন ঘণ্টা" }, unit: "qty", perPeriod: true },
    { id: "periodDays", label: { en: "Days in the month you are counting", bn: "যে মাসের হিসাব করছেন তার দিন সংখ্যা" }, unit: "days", perPeriod: true },
  ],
  formulas: [
    { id: "projectMargin", use: "contributionMargin", map: { price: "projectPrice", varCost: "projectCost" } },
    { id: "projectMarginPct", use: "contributionMarginPct", map: { price: "projectPrice", varCost: "projectCost" } },
    { id: "breakEvenProjects", use: "breakEvenUnits", map: { fixed: "fixed", price: "projectPrice", varCost: "projectCost" } },
    { id: "sponsorShare", name: { en: "Share of income from sponsors", bn: "স্পনসর থেকে আসা আয়ের অংশ" }, use: "shareOfMoney", map: { part: "sponsorIncome", whole: "revenue" } },
    { id: "platformShare", name: { en: "Share of income from platforms", bn: "প্ল্যাটফর্ম থেকে আসা আয়ের অংশ" }, use: "shareOfMoney", map: { part: "platformIncome", whole: "revenue" } },
    { id: "unpaidDays", name: { en: "Days of income still unpaid", bn: "আয়ের যত দিনের টাকা এখনো বাকি" }, use: "receivableDays", map: { receivables: "receivables", revenue: "revenue", periodDays: "periodDays" } },
    { id: "timeUsed", name: { en: "Share of your hours used", bn: "আপনার ঘণ্টার কতটা কাজে লেগেছে" }, use: "capacityUtilisation", map: { used: "hoursUsed", capacity: "hoursAvailable" } },
    { id: "gearPayback", name: { en: "Months to earn back gear cost", bn: "গিয়ারের খরচ উঠে আসতে কত মাস" }, use: "payback", map: { investment: "gearCost", profitPerPeriod: "monthlyProfit" } },
  ],
  questions: [
    { en: "How much of your income depends on one platform, one sponsor or one client?", bn: "আপনার আয়ের কতটা একটা প্ল্যাটফর্ম, একজন স্পনসর বা একজন ক্লায়েন্টের উপর নির্ভর করে?" },
    { en: "Do you have a written deal for usage rights and payment dates?", bn: "ব্যবহারের অধিকার আর পেমেন্টের তারিখ নিয়ে কি লিখিত চুক্তি আছে?" },
    { en: "Which content or service brings repeat income, and which is one time?", bn: "কোন কনটেন্ট বা সার্ভিস থেকে বারবার আয় আসে, আর কোনটা একবারের?" },
    { en: "How will you cover slow months?", bn: "মন্দা মাসগুলো কীভাবে চালাবেন?" },
  ],
  risks: [
    { en: "A platform changing rules or reach, so income drops.", bn: "প্ল্যাটফর্মের নিয়ম বা রিচ বদলে আয় কমে যাওয়া।" },
    { en: "Using music, photos or clips without the right to use them.", bn: "অনুমতি ছাড়া মিউজিক, ছবি বা ক্লিপ ব্যবহার করা।" },
    { en: "Clients paying late or not paying after the work is delivered.", bn: "কাজ দেওয়ার পর ক্লায়েন্টের দেরিতে বা একেবারে পেমেন্ট না করা।" },
    { en: "Gear lost, stolen or broken with no cover.", bn: "গিয়ার হারানো, চুরি বা ভেঙে যাওয়া, কোনো কভার ছাড়া।" },
  ],
  seasonal: true,
  related: { paths: [], halalCheck: true },
};
