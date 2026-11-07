// Transport and logistics. Data only. No numbers, no benchmarks. See docs/design/sector-model.md.
import type { SectorFamily } from "../types";

export const transportLogistics: SectorFamily = {
  id: "transport-logistics",
  name: { en: "Transport and logistics (ride, courier, trucking)", bn: "পরিবহন ও লজিস্টিকস (রাইড, কুরিয়ার, ট্রাক)" },
  summary: {
    en: "Moves people or goods for a fare. Trips filled, fuel and vehicle upkeep decide the result.",
    bn: "ভাড়া নিয়ে মানুষ বা মালামাল পরিবহন। ট্রিপ কতটা ভরে, জ্বালানি আর গাড়ির মেইনটেনেন্সের ওপর ফলাফল নির্ভর করে।",
  },
  aliases: {
    en: ["ride sharing", "cng", "rickshaw", "truck", "courier", "delivery rider", "bus", "pickup van", "warehouse", "logistics"],
    bn: ["রাইড শেয়ার", "সিএনজি", "রিকশা", "ট্রাক", "কুরিয়ার", "ডেলিভারি রাইডার", "বাস", "পিকআপ", "গুদাম"],
  },
  inputs: [
    { id: "fare", label: { en: "Average fare or charge per trip or parcel", bn: "প্রতি ট্রিপ বা পার্সেলের গড় ভাড়া" }, unit: "money", perPeriod: false, required: true },
    { id: "tripCost", label: { en: "Direct cost per trip or parcel (fuel, toll, rider pay)", bn: "প্রতি ট্রিপ বা পার্সেলের সরাসরি খরচ (জ্বালানি, টোল, রাইডারের পাওনা)" }, unit: "money", perPeriod: false, required: true },
    { id: "fixed", label: { en: "Fixed costs for the month (instalment, insurance, parking, licence)", bn: "মাসের ফিক্সড খরচ (কিস্তি, বিমা, পার্কিং, লাইসেন্স)" }, unit: "money", perPeriod: true, required: true },
    { id: "revenue", label: { en: "Fares earned in the month", bn: "মাসে আয় হওয়া ভাড়া" }, unit: "money", perPeriod: true },
    { id: "fuelCost", label: { en: "Fuel cost for the month", bn: "মাসের জ্বালানি খরচ" }, unit: "money", perPeriod: true },
    { id: "repairCost", label: { en: "Repair and upkeep for the month", bn: "মাসের মেরামত ও মেইনটেনেন্স" }, unit: "money", perPeriod: true },
    { id: "loadUsed", label: { en: "Load or seats carried", bn: "বহন করা মাল বা সিট" }, unit: "qty", perPeriod: true },
    { id: "loadAvailable", label: { en: "Load or seats you could carry", bn: "বহন করার সক্ষমতা (মাল বা সিট)" }, unit: "qty", perPeriod: true },
    { id: "daysRunning", label: { en: "Days the vehicle ran", bn: "গাড়ি যত দিন চলেছে" }, unit: "qty", perPeriod: true },
    { id: "daysAvailable", label: { en: "Days the vehicle was available", bn: "গাড়ি যত দিন হাতে ছিল" }, unit: "qty", perPeriod: true },
    { id: "unpaid", label: { en: "Fares not yet received", bn: "এখনো পাওয়া হয়নি এমন ভাড়া" }, unit: "money", perPeriod: false },
    { id: "periodDays", label: { en: "Days in the period", bn: "পিরিয়ডের দিন সংখ্যা" }, unit: "days", perPeriod: true },
  ],
  formulas: [
    { id: "tripMargin", use: "contributionMargin", map: { price: "fare", varCost: "tripCost" } },
    { id: "breakEvenTrips", use: "breakEvenUnits", map: { fixed: "fixed", price: "fare", varCost: "tripCost" } },
    { id: "loadFill", use: "loadFactor", map: { usedLoad: "loadUsed", availableLoad: "loadAvailable" }, name: { en: "Load or seats filled (percent)", bn: "ভরা মাল বা সিট (শতাংশ)" } },
    { id: "vehicleUse", use: "capacityUtilisation", map: { used: "daysRunning", capacity: "daysAvailable" }, name: { en: "Days on the road (percent)", bn: "রাস্তায় থাকা দিন (শতাংশ)" } },
    { id: "fuelShare", use: "shareOfMoney", map: { part: "fuelCost", whole: "revenue" }, name: { en: "Fuel cost (percent of fares)", bn: "জ্বালানি খরচ (ভাড়ার শতাংশ)" } },
    { id: "collectDays", use: "receivableDays", map: { receivables: "unpaid", revenue: "revenue", periodDays: "periodDays" }, name: { en: "Days to receive fares", bn: "ভাড়া পেতে দিন" } },
    { id: "monthProfit", name: { en: "Profit for the month", bn: "মাসের মুনাফা" }, expr: "revenue - fuelCost - repairCost - fixed", needs: ["revenue", "fuelCost", "repairCost", "fixed"], result: "money" },
  ],
  questions: [
    { en: "How often does the vehicle return empty?", bn: "গাড়ি কতবার খালি ফেরে?" },
    { en: "Which routes or hours pay well, and which waste fuel?", bn: "কোন রুট বা সময়ে ভালো আয় হয়, আর কোনটায় জ্বালানি নষ্ট হয়?" },
    { en: "When is the next big service, tyre or fitness check?", bn: "পরের বড় সার্ভিস, টায়ার বা ফিটনেস চেক কবে?" },
    { en: "Are the licence, route permit and insurance current?", bn: "লাইসেন্স, রুট পারমিট ও বিমা আপডেট আছে কি না?" },
  ],
  risks: [
    { en: "Fuel price changes while fares stay the same.", bn: "জ্বালানির দাম বদলায়, কিন্তু ভাড়া একই থাকে।" },
    { en: "Breakdown or accident stops income.", bn: "গাড়ি নষ্ট বা দুর্ঘটনায় আয় বন্ধ হয়ে যায়।" },
    { en: "Fines, tolls and checks on the road.", bn: "রাস্তায় জরিমানা, টোল ও তল্লাশি।" },
    { en: "Drivers or riders leave or misuse the vehicle.", bn: "ড্রাইভার বা রাইডার চলে যায় বা গাড়ির অপব্যবহার করে।" },
    { en: "Loss or damage of goods on the way.", bn: "পথে মাল হারানো বা নষ্ট হওয়া।" },
  ],
  seasonal: true,
  related: { paths: [], halalCheck: true },
};
