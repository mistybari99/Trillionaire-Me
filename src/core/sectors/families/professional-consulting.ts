// Professional services and consulting. Data only. No numbers, no benchmarks. See docs/design/sector-model.md.
import type { SectorFamily } from "../types";

export const professionalConsulting: SectorFamily = {
  id: "professional-consulting",
  name: { en: "Professional services and consulting", bn: "প্রফেশনাল সার্ভিস ও কনসাল্টিং" },
  summary: {
    en: "Sells expert time and skill: consultant, lawyer, accountant, architect, engineer or agency. Billable hours, rate and unpaid invoices decide the result.",
    bn: "বিশেষজ্ঞ সময় ও দক্ষতা বিক্রি: কনসাল্ট্যান্ট, আইনজীবী, অ্যাকাউন্ট্যান্ট, আর্কিটেক্ট, ইঞ্জিনিয়ার বা এজেন্সি। বিল করা ঘণ্টা, রেট আর বাকি ইনভয়েসের ওপর ফলাফল নির্ভর করে।",
  },
  aliases: {
    en: ["consultant", "lawyer", "law firm", "accountant", "architect", "engineer", "agency", "advisory", "audit firm"],
    bn: ["কনসাল্ট্যান্ট", "আইনজীবী", "অ্যাকাউন্ট্যান্ট", "আর্কিটেক্ট", "ইঞ্জিনিয়ার", "এজেন্সি", "পরামর্শ সেবা"],
  },
  inputs: [
    { id: "price", label: { en: "Your rate for one billable hour", bn: "এক বিল-যোগ্য ঘণ্টার রেট" }, unit: "money", perPeriod: false, required: true },
    { id: "varCost", label: { en: "Direct cost of one billable hour (helper pay, tools, travel)", bn: "এক বিল-যোগ্য ঘণ্টার সরাসরি খরচ (হেল্পারের বেতন, টুল, যাতায়াত)" }, unit: "money", perPeriod: false, required: true },
    { id: "fixed", label: { en: "Fixed costs for the month (office, software, licence, your own pay)", bn: "মাসের ফিক্সড খরচ (অফিস, সফটওয়্যার, লাইসেন্স, নিজের বেতন)" }, unit: "money", perPeriod: true, required: true },
    { id: "revenue", label: { en: "Invoiced amount for the month", bn: "মাসে ইনভয়েস করা মোট টাকা" }, unit: "money", perPeriod: true },
    { id: "billedHours", label: { en: "Hours billed to clients in the month", bn: "মাসে ক্লায়েন্টকে বিল করা ঘণ্টা" }, unit: "qty", perPeriod: true },
    { id: "workHours", label: { en: "Hours you and your team worked in the month", bn: "মাসে আপনি ও আপনার টিম মোট যত ঘণ্টা কাজ করেছেন" }, unit: "qty", perPeriod: true },
    { id: "receivables", label: { en: "Invoices not yet paid", bn: "এখনো পরিশোধ না হওয়া ইনভয়েস" }, unit: "money", perPeriod: false },
    { id: "periodDays", label: { en: "Days in the period", bn: "পিরিয়ডের দিন" }, unit: "days", perPeriod: true },
    { id: "topClientRevenue", label: { en: "Invoiced to your biggest client", bn: "সবচেয়ে বড় ক্লায়েন্টকে ইনভয়েস করা টাকা" }, unit: "money", perPeriod: true },
    { id: "marketingSpend", label: { en: "Spent on finding new clients", bn: "নতুন ক্লায়েন্ট পেতে খরচ" }, unit: "money", perPeriod: true },
    { id: "newClients", label: { en: "New clients won", bn: "নতুন পাওয়া ক্লায়েন্ট" }, unit: "count", perPeriod: true },
    { id: "teamCost", label: { en: "Team pay for the month", bn: "মাসের টিমের বেতন" }, unit: "money", perPeriod: true },
  ],
  formulas: [
    { id: "hourMargin", use: "contributionMargin", map: { price: "price", varCost: "varCost" } },
    { id: "breakEvenHours", use: "breakEvenUnits", map: { fixed: "fixed", price: "price", varCost: "varCost" } },
    { id: "utilisation", use: "capacityUtilisation", map: { used: "billedHours", capacity: "workHours" }, name: { en: "Billable share of worked hours (percent)", bn: "কাজের ঘণ্টার কত শতাংশ বিল হয়েছে" } },
    { id: "receivableDays", use: "receivableDays", map: { receivables: "receivables", revenue: "revenue", periodDays: "periodDays" } },
    { id: "clientConcentration", use: "shareOfMoney", map: { part: "topClientRevenue", whole: "revenue" }, name: { en: "Biggest client (percent of invoiced)", bn: "সবচেয়ে বড় ক্লায়েন্ট (ইনভয়েসের শতাংশ)" } },
    { id: "cac", use: "cac", map: { marketingSpend: "marketingSpend", newCustomers: "newClients" }, name: { en: "Cost to win one new client", bn: "একজন নতুন ক্লায়েন্ট পেতে খরচ" } },
    { id: "teamShare", use: "shareOfMoney", map: { part: "teamCost", whole: "revenue" }, name: { en: "Team pay (percent of invoiced)", bn: "টিমের বেতন (ইনভয়েসের শতাংশ)" } },
    { id: "monthProfit", name: { en: "Profit for the month (own expression)", bn: "মাসের মুনাফা (নিজের লেখা এক্সপ্রেশন)" }, expr: "revenue - teamCost - fixed", needs: ["revenue", "teamCost", "fixed"], result: "money" },
  ],
  questions: [
    { en: "How many hours go to work you cannot bill, such as meetings and proposals?", bn: "বিল করা যায় না এমন কাজে কত ঘণ্টা যায়, যেমন মিটিং ও প্রপোজাল?" },
    { en: "Do you take an advance, and what do you do when a client pays late?", bn: "অ্যাডভান্স নেন কি না, আর ক্লায়েন্ট দেরিতে দিলে কী করেন?" },
    { en: "Does one client or one referral source bring most of your work?", bn: "একজন ক্লায়েন্ট বা একটা রেফারেল সোর্স থেকে কি বেশিরভাগ কাজ আসে?" },
    { en: "Which professional licence or membership rules apply to you?", bn: "আপনার জন্য কোন প্রফেশনাল লাইসেন্স বা সদস্যপদের নিয়ম প্রযোজ্য?" },
  ],
  risks: [
    { en: "Income stops when you stop working, since time cannot be stored.", bn: "কাজ বন্ধ হলে আয়ও বন্ধ, কারণ সময় জমিয়ে রাখা যায় না।" },
    { en: "Losing one big client can cut income suddenly.", bn: "একটা বড় ক্লায়েন্ট চলে গেলে হঠাৎ আয় কমে যেতে পারে।" },
    { en: "Late payment strains cash while pay and rent continue.", bn: "দেরিতে পেমেন্ট এলে ক্যাশে চাপ পড়ে, অথচ বেতন ও ভাড়া চলতেই থাকে।" },
    { en: "Scope grows beyond what was agreed and hours go unpaid.", bn: "কাজ চুক্তির বাইরে বেড়ে যায় আর ঘণ্টার টাকা পাওয়া যায় না।" },
  ],
  seasonal: false,
  related: { paths: [], halalCheck: false },
};
