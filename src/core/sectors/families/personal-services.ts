// Personal services (salon, laundry, tailor, repair by appointment). Data only. No numbers, no benchmarks. See docs/design/sector-model.md.
import type { SectorFamily } from "../types";

export const personalServices: SectorFamily = {
  id: "personal-services",
  name: { en: "Personal services (salon, laundry, tailor)", bn: "পারসোনাল সার্ভিস (সেলুন, লন্ড্রি, দর্জি)" },
  summary: {
    en: "Sells your time and skill to customers one by one, often by appointment. Booked hours, repeat customers and supplies decide the result.",
    bn: "গ্রাহককে একজন একজন করে নিজের সময় ও দক্ষতা বিক্রি, অনেক সময় বুকিং নিয়ে। বুকড সময়, রিপিট গ্রাহক আর সাপ্লাইয়ের ওপর ফলাফল নির্ভর করে।",
  },
  aliases: {
    en: ["salon", "parlour", "barber", "laundry", "dry cleaning", "tailor", "boutique tailoring", "spa", "cleaning service", "photo studio", "repair by appointment"],
    bn: ["সেলুন", "পার্লার", "নাপিত", "লন্ড্রি", "দর্জি", "টেইলার", "ড্রাই ক্লিনিং", "ক্লিনিং সার্ভিস", "ফটো স্টুডিও"],
  },
  inputs: [
    { id: "price", label: { en: "Average price charged for one job or visit", bn: "একটা কাজ বা ভিজিটের জন্য গড় নেওয়া দাম" }, unit: "money", perPeriod: false, required: true },
    { id: "varCost", label: { en: "Supplies and materials used in one job or visit", bn: "একটা কাজ বা ভিজিটে ব্যবহার হওয়া সাপ্লাই ও মেটেরিয়াল" }, unit: "money", perPeriod: false, required: true },
    { id: "fixed", label: { en: "Fixed costs for the month (rent, utilities, licence)", bn: "মাসের ফিক্সড খরচ (ভাড়া, ইউটিলিটি, লাইসেন্স)" }, unit: "money", perPeriod: true, required: true },
    { id: "revenue", label: { en: "Total income from services for the month", bn: "মাসে সার্ভিস থেকে মোট আয়" }, unit: "money", perPeriod: true },
    { id: "staffCost", label: { en: "Staff pay and commission for the month", bn: "মাসের স্টাফের বেতন ও কমিশন" }, unit: "money", perPeriod: true },
    { id: "bookedHours", label: { en: "Hours booked with customers in the month", bn: "মাসে গ্রাহকের জন্য বুক করা ঘণ্টা" }, unit: "qty", perPeriod: true },
    { id: "availableHours", label: { en: "Hours you and your staff could work in the month", bn: "মাসে আপনি ও স্টাফ মোট যত ঘণ্টা কাজ করতে পারতেন" }, unit: "qty", perPeriod: true },
    { id: "repeatCustomers", label: { en: "Customers who came back in the month", bn: "মাসে যেসব গ্রাহক আবার এসেছেন" }, unit: "count", perPeriod: true },
    { id: "totalCustomers", label: { en: "All customers served in the month", bn: "মাসে মোট সার্ভ করা গ্রাহক" }, unit: "count", perPeriod: true },
    { id: "noShows", label: { en: "Booked visits where the customer did not come", bn: "বুকিং থাকা সত্ত্বেও গ্রাহক না আসা ভিজিট" }, unit: "count", perPeriod: true },
    { id: "bookings", label: { en: "All booked visits in the month", bn: "মাসে মোট বুকিং" }, unit: "count", perPeriod: true },
  ],
  formulas: [
    { id: "jobMargin", use: "contributionMargin", map: { price: "price", varCost: "varCost" } },
    { id: "jobMarginPct", use: "contributionMarginPct", map: { price: "price", varCost: "varCost" } },
    { id: "breakEvenJobs", use: "breakEvenUnits", map: { fixed: "fixed", price: "price", varCost: "varCost" } },
    { id: "hourUse", use: "capacityUtilisation", map: { used: "bookedHours", capacity: "availableHours" }, name: { en: "Booked hours (percent of hours available)", bn: "বুকড ঘণ্টা (পাওয়া ঘণ্টার শতাংশ)" } },
    { id: "incomePerHour", use: "revenuePerCapacity", map: { revenue: "revenue", capacityUnits: "availableHours" }, name: { en: "Income per available hour", bn: "প্রতি পাওয়া ঘণ্টায় আয়" } },
    { id: "staffCostPct", use: "shareOfMoney", map: { part: "staffCost", whole: "revenue" }, name: { en: "Staff cost (percent of income)", bn: "স্টাফের খরচ (আয়ের শতাংশ)" } },
    { id: "repeatPct", use: "occupancy", map: { occupiedUnits: "repeatCustomers", availableUnits: "totalCustomers" }, name: { en: "Returning customers (percent of all customers)", bn: "ফিরে আসা গ্রাহক (মোট গ্রাহকের শতাংশ)" } },
    { id: "noShowPct", use: "occupancy", map: { occupiedUnits: "noShows", availableUnits: "bookings" }, name: { en: "No-shows (percent of bookings)", bn: "না আসা (বুকিংয়ের শতাংশ)" } },
    { id: "monthProfit", name: { en: "Profit for the month (own expression)", bn: "মাসের মুনাফা (নিজের লেখা এক্সপ্রেশন)" }, expr: "revenue - staffCost - fixed", needs: ["revenue", "staffCost", "fixed"], result: "money" },
  ],
  questions: [
    { en: "Which services take the most time but earn the least per hour?", bn: "কোন সার্ভিসে সময় বেশি লাগে কিন্তু ঘণ্টা-প্রতি আয় কম?" },
    { en: "What happens to your income when your best worker or you are away?", bn: "আপনি বা সবচেয়ে দক্ষ কারিগর না থাকলে আয়ের কী হয়?" },
    { en: "How do you remind customers and handle late or missed visits?", bn: "গ্রাহককে কীভাবে রিমাইন্ড করেন, আর দেরি বা না-আসা কীভাবে সামলান?" },
    { en: "Do you take advance for custom work such as stitching?", bn: "সেলাইয়ের মতো কাস্টম কাজে অ্যাডভান্স নেন কি না?" },
  ],
  risks: [
    { en: "Income depends on a few skilled people who can leave.", bn: "আয় অল্প কয়েকজন দক্ষ মানুষের ওপর নির্ভর করে, যাঁরা চলে যেতে পারেন।" },
    { en: "Empty hours still carry rent and pay.", bn: "খালি সময়েও ভাড়া ও বেতন দিতে হয়।" },
    { en: "Customer complaints and rework on damaged or wrong jobs.", bn: "ক্ষতি বা ভুল কাজের জন্য গ্রাহকের অভিযোগ ও আবার কাজ করা।" },
    { en: "Supplies and chemicals need safe storage and clean handling.", bn: "সাপ্লাই ও কেমিক্যাল নিরাপদে রাখা ও পরিষ্কারভাবে সামলানো দরকার।" },
  ],
  seasonal: true,
  related: { paths: [], halalCheck: true },
};
