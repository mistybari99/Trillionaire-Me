// Real estate. Data only. No numbers, no benchmarks. See docs/design/sector-model.md.
import type { SectorFamily } from "../types";

export const realEstate: SectorFamily = {
  id: "real-estate",
  name: { en: "Real estate (rental, brokerage, land development)", bn: "প্রপার্টি ও জমির ব্যবসা (ভাড়া, ব্রোকারেজ, জমি ডেভেলপমেন্ট)" },
  summary: {
    en: "Rents out property, earns commission, or develops land. Empty units, upkeep and slow rent decide the result.",
    bn: "প্রপার্টি ভাড়া দেওয়া, কমিশন নেওয়া বা জমি ডেভেলপ করা। খালি ইউনিট, মেইনটেনেন্স আর দেরিতে ভাড়া আসার ওপর ফলাফল নির্ভর করে।",
  },
  aliases: {
    en: ["rental property", "landlord", "broker", "property agent", "land development", "flat rent", "apartment", "shop rent", "real estate"],
    bn: ["বাড়ি ভাড়া", "বাড়িওয়ালা", "ফ্ল্যাট", "দালাল", "প্রপার্টি এজেন্ট", "জমি", "দোকান ভাড়া", "প্রপার্টি ব্যবসা"],
  },
  inputs: [
    { id: "rentPerUnit", label: { en: "Rent for one unit for the month", bn: "একটা ইউনিটের মাসের ভাড়া" }, unit: "money", perPeriod: false, required: true },
    { id: "unitsTotal", label: { en: "Units you own or manage", bn: "মোট ইউনিট যা আপনার বা আপনার দেখাশোনায়" }, unit: "count", perPeriod: false, required: true },
    { id: "unitsRented", label: { en: "Units rented now", bn: "এখন ভাড়া দেওয়া ইউনিট" }, unit: "count", perPeriod: true, required: true },
    { id: "revenue", label: { en: "Rent due for the month", bn: "মাসে পাওনা ভাড়া" }, unit: "money", perPeriod: true },
    { id: "rentOwed", label: { en: "Rent not yet collected", bn: "এখনো আদায় হয়নি এমন ভাড়া" }, unit: "money", perPeriod: false },
    { id: "upkeep", label: { en: "Upkeep and repair for the month", bn: "মাসের মেইনটেনেন্স ও মেরামত" }, unit: "money", perPeriod: true },
    { id: "fixed", label: { en: "Fixed costs for the month (service charge, guard, utilities, taxes)", bn: "মাসের ফিক্সড খরচ (সার্ভিস চার্জ, গার্ড, ইউটিলিটি, কর)" }, unit: "money", perPeriod: true },
    { id: "periodDays", label: { en: "Days in the period", bn: "পিরিয়ডের দিন সংখ্যা" }, unit: "days", perPeriod: true },
    { id: "invested", label: { en: "Money put into the property", bn: "প্রপার্টিতে লাগানো টাকা" }, unit: "money", perPeriod: false },
    { id: "monthlyProfit", label: { en: "Profit you keep each month from it", bn: "প্রতি মাসে এ থেকে আপনার থাকা মুনাফা" }, unit: "money", perPeriod: true },
    { id: "commission", label: { en: "Commission earned in the month", bn: "মাসে পাওয়া কমিশন" }, unit: "money", perPeriod: true },
  ],
  formulas: [
    { id: "occupancyRate", use: "occupancy", map: { occupiedUnits: "unitsRented", availableUnits: "unitsTotal" }, name: { en: "Units rented (percent)", bn: "ভাড়া হওয়া ইউনিট (শতাংশ)" } },
    { id: "rentDays", use: "receivableDays", map: { receivables: "rentOwed", revenue: "revenue", periodDays: "periodDays" }, name: { en: "Days to collect rent", bn: "ভাড়া আদায়ে দিন" } },
    { id: "upkeepShare", use: "shareOfMoney", map: { part: "upkeep", whole: "revenue" }, name: { en: "Upkeep (percent of rent)", bn: "মেইনটেনেন্স (ভাড়ার শতাংশ)" } },
    { id: "netIncome", name: { en: "Net income for the month", bn: "মাসের নিট আয়" }, expr: "revenue + commission - upkeep - fixed", needs: ["revenue", "commission", "upkeep", "fixed"], result: "money" },
    { id: "paybackMonths", use: "payback", map: { investment: "invested", profitPerPeriod: "monthlyProfit" }, name: { en: "Months to get the money back", bn: "টাকা ফেরত পেতে মাস" } },
    { id: "rentPerUnitAvg", use: "revenuePerCapacity", map: { revenue: "revenue", capacityUnits: "unitsTotal" }, name: { en: "Rent per unit", bn: "ইউনিট প্রতি ভাড়া" } },
  ],
  questions: [
    { en: "How long do units stay empty between tenants?", bn: "এক ভাড়াটিয়া থেকে আরেকজনের মাঝে ইউনিট কতদিন খালি থাকে?" },
    { en: "Are the papers, ownership and approvals clear and checked?", bn: "কাগজপত্র, মালিকানা ও অনুমোদন পরিষ্কার ও যাচাই করা আছে কি না?" },
    { en: "What repairs are coming soon, and who pays?", bn: "কাছাকাছি সময়ে কী মেরামত লাগবে, আর খরচ কে দেবে?" },
    { en: "Is there a written agreement with each tenant or buyer?", bn: "প্রতিটা ভাড়াটিয়া বা ক্রেতার সাথে লিখিত চুক্তি আছে কি না?" },
  ],
  risks: [
    { en: "Units stay empty and rent stops.", bn: "ইউনিট খালি থাকে, ভাড়া বন্ধ হয়ে যায়।" },
    { en: "Tenants pay late or leave without notice.", bn: "ভাড়াটিয়া দেরিতে দেয় বা না জানিয়ে চলে যায়।" },
    { en: "Disputes over ownership or land papers.", bn: "মালিকানা বা জমির কাগজ নিয়ে বিরোধ।" },
    { en: "A big repair cost comes at once.", bn: "একসাথে বড় মেরামত খরচ এসে পড়ে।" },
  ],
  seasonal: false,
  related: { paths: [], halalCheck: true },
};
