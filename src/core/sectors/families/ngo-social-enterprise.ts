// NGO, cooperative, foundation and social enterprise. Data only. No numbers, no benchmarks. See docs/design/sector-model.md.
import type { SectorFamily } from "../types";

export const ngoSocialEnterprise: SectorFamily = {
  id: "ngo-social-enterprise",
  name: { en: "NGO, cooperative and social enterprise", bn: "এনজিও, সমবায় ও সোশ্যাল এন্টারপ্রাইজ" },
  summary: {
    en: "Runs projects, a cooperative, a foundation or a business with a social aim. Grants, own income, programme cost and reach decide how long the work can continue.",
    bn: "প্রজেক্ট, সমবায়, ফাউন্ডেশন বা সামাজিক গোলের ব্যবসা চালায়। অনুদান, নিজের আয়, প্রোগ্রামের খরচ আর কতজনের কাছে পৌঁছানো গেল তার ওপর কাজ কতদিন চলবে তা নির্ভর করে।",
  },
  aliases: {
    en: ["ngo", "non profit", "cooperative", "foundation", "social enterprise", "charity", "grant project", "community project", "trust"],
    bn: ["এনজিও", "অলাভজনক", "সমবায়", "ফাউন্ডেশন", "সামাজিক ব্যবসা", "দাতব্য", "প্রজেক্ট", "ট্রাস্ট"],
  },
  inputs: [
    { id: "grantIncome", label: { en: "Grants and donations received in the month", bn: "মাসে পাওয়া অনুদান ও দান" }, unit: "money", perPeriod: true, required: true },
    { id: "ownIncome", label: { en: "Own income in the month (sales, fees, membership)", bn: "মাসের নিজের আয় (বিক্রি, ফি, সদস্য চাঁদা)" }, unit: "money", perPeriod: true, required: true },
    { id: "programCost", label: { en: "Spent on programme work in the month", bn: "মাসে প্রোগ্রামের কাজে খরচ" }, unit: "money", perPeriod: true, required: true },
    { id: "adminCost", label: { en: "Office, admin and fundraising cost in the month", bn: "মাসের অফিস, অ্যাডমিন ও ফান্ডরেইজিং খরচ" }, unit: "money", perPeriod: true, required: true },
    { id: "cashReserve", label: { en: "Cash and bank balance available now", bn: "এখন হাতে থাকা ক্যাশ ও ব্যাংক ব্যালেন্স" }, unit: "money", perPeriod: false },
    { id: "budgetTotal", label: { en: "Budget approved for the project", bn: "প্রজেক্টের অনুমোদিত বাজেট" }, unit: "money", perPeriod: false },
    { id: "budgetSpent", label: { en: "Spent from the project budget so far", bn: "প্রজেক্ট বাজেট থেকে এ পর্যন্ত খরচ" }, unit: "money", perPeriod: false },
    { id: "peopleReached", label: { en: "People or families reached in the month", bn: "মাসে যত মানুষ বা পরিবারের কাছে পৌঁছানো গেছে" }, unit: "count", perPeriod: true },
    { id: "peopleTarget", label: { en: "People or families you planned to reach", bn: "যত মানুষ বা পরিবারের কাছে পৌঁছানোর পরিকল্পনা ছিল" }, unit: "count", perPeriod: true },
    { id: "periodDays", label: { en: "Days in the period you are looking at", bn: "যে সময়ের হিসাব দেখছেন তার দিন সংখ্যা" }, unit: "days", perPeriod: true },
  ],
  formulas: [
    { id: "ownIncomeShare", use: "shareOfMoney", map: { part: "ownIncome", whole: "grantIncome" }, name: { en: "Own income compared with grants (percent)", bn: "অনুদানের তুলনায় নিজের আয় (শতাংশ)" } },
    { id: "adminShare", use: "shareOfMoney", map: { part: "adminCost", whole: "programCost" }, name: { en: "Admin cost compared with programme cost (percent)", bn: "প্রোগ্রাম খরচের তুলনায় অ্যাডমিন খরচ (শতাংশ)" } },
    { id: "budgetUse", use: "shareOfMoney", map: { part: "budgetSpent", whole: "budgetTotal" }, name: { en: "Project budget used (percent)", bn: "প্রজেক্ট বাজেট ব্যবহার (শতাংশ)" } },
    { id: "reachRate", use: "occupancy", map: { occupiedUnits: "peopleReached", availableUnits: "peopleTarget" }, name: { en: "Reach against plan (percent)", bn: "পরিকল্পনার তুলনায় পৌঁছানো (শতাংশ)" } },
    { id: "costPerPerson", name: { en: "Programme cost per person reached", bn: "প্রতিজনে প্রোগ্রাম খরচ" }, expr: "programCost / peopleReached", needs: ["programCost", "peopleReached"], result: "money" },
    { id: "monthlyOut", name: { en: "Total spending for the month (own expression)", bn: "মাসের মোট খরচ (নিজের লেখা এক্সপ্রেশন)" }, expr: "programCost + adminCost", needs: ["programCost", "adminCost"], result: "money" },
    { id: "monthlyGap", name: { en: "Income minus spending for the month (own expression)", bn: "মাসের আয় থেকে খরচ বাদ (নিজের লেখা এক্সপ্রেশন)" }, expr: "grantIncome + ownIncome - programCost - adminCost", needs: ["grantIncome", "ownIncome", "programCost", "adminCost"], result: "money" },
    { id: "budgetLeft", name: { en: "Project budget left (own expression)", bn: "প্রজেক্ট বাজেটের বাকি টাকা (নিজের লেখা এক্সপ্রেশন)" }, expr: "budgetTotal - budgetSpent", needs: ["budgetTotal", "budgetSpent"], result: "money" },
  ],
  questions: [
    { en: "Which registration and reporting rules apply to you, and who checks them?", bn: "আপনার ওপর কোন নিবন্ধন ও রিপোর্টিংয়ের নিয়ম প্রযোজ্য, আর কে যাচাই করে?" },
    { en: "When does each grant end, and what replaces it?", bn: "প্রতিটা অনুদান কবে শেষ হয়, আর তার বদলে কী আসবে?" },
    { en: "How do you show donors and members where the money went?", bn: "দাতা ও সদস্যকে টাকা কোথায় গেল তা কীভাবে দেখান?" },
    { en: "How do you hear from the people you serve, and what did you change after?", bn: "যাঁদের সেবা দেন তাঁদের কথা কীভাবে শোনেন, আর তারপর কী বদলেছেন?" },
  ],
  risks: [
    { en: "A main donor stops or delays a grant.", bn: "প্রধান দাতা অনুদান বন্ধ বা দেরি করে।" },
    { en: "Money meant for one project is spent on another.", bn: "এক প্রজেক্টের টাকা অন্য কাজে খরচ হয়ে যায়।" },
    { en: "Weak records make audits and reports hard.", bn: "দুর্বল রেকর্ডে অডিট ও রিপোর্ট কঠিন হয়।" },
    { en: "Depending on a few key people or one funder.", bn: "অল্প কয়েকজন বা একটা ফান্ডারের ওপর নির্ভর করা।" },
    { en: "Registration or rules change.", bn: "নিবন্ধন বা নিয়ম বদলায়।" },
  ],
  seasonal: false,
  related: { paths: [], halalCheck: true },
};
