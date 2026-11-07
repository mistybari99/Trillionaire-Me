// Healthcare and pharmacy. Data only. No numbers, no benchmarks. See docs/design/sector-model.md.
import type { SectorFamily } from "../types";

export const healthcarePharmacy: SectorFamily = {
  id: "healthcare-pharmacy",
  name: { en: "Healthcare and pharmacy (clinic, diagnostic, dental, medicine shop)", bn: "হেলথকেয়ার ও ফার্মেসি (ক্লিনিক, ডায়াগনস্টিক, ডেন্টাল, ওষুধের দোকান)" },
  summary: {
    en: "Provides care, tests or medicines. Patient visits, test volume, stock that can expire and equipment cost decide the result. This is record keeping only, not medical advice.",
    bn: "চিকিৎসা, টেস্ট বা ওষুধ সেবা দেয়। রোগীর ভিজিট, টেস্টের সংখ্যা, মেয়াদ শেষ হতে পারে এমন স্টক আর যন্ত্রের খরচের ওপর ফলাফল নির্ভর করে। এটা শুধু হিসাব রাখার জন্য, চিকিৎসা পরামর্শ নয়।",
  },
  aliases: {
    en: ["clinic", "pharmacy", "diagnostic centre", "dental", "medicine shop", "drug store", "hospital", "lab", "chamber"],
    bn: ["ক্লিনিক", "ফার্মেসি", "ডায়াগনস্টিক সেন্টার", "ডেন্টাল", "ওষুধের দোকান", "হাসপাতাল", "ল্যাব", "চেম্বার"],
  },
  inputs: [
    { id: "price", label: { en: "Fee for one visit or test, or selling price of one medicine unit", bn: "এক ভিজিট বা টেস্টের ফি, বা এক ইউনিট ওষুধের বিক্রির দাম" }, unit: "money", perPeriod: false, required: true },
    { id: "varCost", label: { en: "Direct cost for one visit, test or medicine unit (kit, consumables, purchase cost)", bn: "এক ভিজিট, টেস্ট বা ওষুধ ইউনিটের সরাসরি খরচ (কিট, কনজিউমেবল, কেনা দাম)" }, unit: "money", perPeriod: false, required: true },
    { id: "fixed", label: { en: "Fixed costs for the month (rent, staff, licence, equipment service)", bn: "মাসের ফিক্সড খরচ (ভাড়া, স্টাফ, লাইসেন্স, যন্ত্রের সার্ভিস)" }, unit: "money", perPeriod: true, required: true },
    { id: "revenue", label: { en: "Sales and fees for the month", bn: "মাসের মোট বিক্রি ও ফি" }, unit: "money", perPeriod: true },
    { id: "cogs", label: { en: "Cost of medicines and kits used in the month", bn: "মাসে ব্যবহৃত ওষুধ ও কিটের খরচ" }, unit: "money", perPeriod: true },
    { id: "inventory", label: { en: "Stock value at cost", bn: "স্টকের খরচ-দামের মোট" }, unit: "money", perPeriod: false },
    { id: "expiredStock", label: { en: "Stock value that expired or was returned unsold", bn: "মেয়াদ শেষ বা অবিক্রিত ফেরত যাওয়া স্টকের মোট" }, unit: "money", perPeriod: true },
    { id: "patientsSeen", label: { en: "Patients seen or tests done in the month", bn: "মাসে দেখা রোগী বা করা টেস্ট" }, unit: "count", perPeriod: true },
    { id: "slotsAvailable", label: { en: "Patient or test slots you could offer in the month", bn: "মাসে রোগী বা টেস্টের যতগুলো স্লট দেওয়া সম্ভব ছিল" }, unit: "count", perPeriod: true },
    { id: "periodDays", label: { en: "Days in the period", bn: "পিরিয়ডের দিন" }, unit: "days", perPeriod: true },
    { id: "equipmentCost", label: { en: "Money put into equipment", bn: "যন্ত্রপাতিতে লাগানো টাকা" }, unit: "money", perPeriod: false },
    { id: "staffCost", label: { en: "Staff and doctor pay for the month", bn: "মাসের স্টাফ ও ডাক্তারের বেতন" }, unit: "money", perPeriod: true },
    { id: "monthProfitIn", label: { en: "Profit per month you expect from the equipment", bn: "যন্ত্র থেকে মাসে যে মুনাফা আশা করেন" }, unit: "money", perPeriod: true },
  ],
  formulas: [
    { id: "visitMargin", use: "contributionMargin", map: { price: "price", varCost: "varCost" } },
    { id: "breakEvenVisits", use: "breakEvenUnits", map: { fixed: "fixed", price: "price", varCost: "varCost" } },
    { id: "grossMargin", use: "grossMargin", map: { revenue: "revenue", cogs: "cogs" } },
    { id: "stockDays", use: "inventoryDays", map: { inventory: "inventory", cogs: "cogs", periodDays: "periodDays" } },
    { id: "expiryShare", use: "shareOfMoney", map: { part: "expiredStock", whole: "inventory" }, name: { en: "Expired or returned stock (percent of stock)", bn: "মেয়াদ শেষ বা ফেরত স্টক (স্টকের শতাংশ)" } },
    { id: "slotUse", use: "occupancy", map: { occupiedUnits: "patientsSeen", availableUnits: "slotsAvailable" }, name: { en: "Slots used (percent)", bn: "স্লট ব্যবহার (শতাংশ)" } },
    { id: "staffShare", use: "shareOfMoney", map: { part: "staffCost", whole: "revenue" }, name: { en: "Staff pay (percent of sales)", bn: "স্টাফের বেতন (বিক্রির শতাংশ)" } },
    { id: "equipmentPayback", use: "payback", map: { investment: "equipmentCost", profitPerPeriod: "monthProfitIn" }, name: { en: "Months for equipment cost to come back", bn: "যন্ত্রের খরচ ফিরতে কত মাস" } },
    { id: "monthProfit", name: { en: "Profit for the month (own expression)", bn: "মাসের মুনাফা (নিজের লেখা এক্সপ্রেশন)" }, expr: "revenue - cogs - staffCost - fixed", needs: ["revenue", "cogs", "staffCost", "fixed"], result: "money" },
  ],
  questions: [
    { en: "How do you track expiry dates, and who checks the shelves?", bn: "মেয়াদের তারিখ কীভাবে ট্র্যাক করেন, আর শেলফ কে দেখে?" },
    { en: "Which licences and registrations apply to your premises and staff?", bn: "আপনার জায়গা ও স্টাফের জন্য কোন লাইসেন্স ও রেজিস্ট্রেশন দরকার?" },
    { en: "Do you buy from licensed suppliers only, and keep the bills?", bn: "শুধু লাইসেন্সধারী সাপ্লায়ার থেকে কেনেন কি না, আর বিল রাখেন কি?" },
    { en: "How are patient records kept private and safe?", bn: "রোগীর রেকর্ড কীভাবে প্রাইভেট ও নিরাপদ রাখেন?" },
  ],
  risks: [
    { en: "Medicines and kits expire and become a loss.", bn: "ওষুধ ও কিটের মেয়াদ শেষ হয়ে লস হয়।" },
    { en: "Equipment breaks down and stops tests or treatment.", bn: "যন্ত্র নষ্ট হলে টেস্ট বা চিকিৎসা বন্ধ হয়ে যায়।" },
    { en: "Rules and inspections can change what you may sell or do.", bn: "নিয়ম ও পরিদর্শনে কী বিক্রি বা করা যাবে তা বদলাতে পারে।" },
    { en: "Dependence on one doctor or key staff member.", bn: "একজন ডাক্তার বা মূল স্টাফের ওপর নির্ভরতা।" },
  ],
  seasonal: true,
  related: { paths: [], halalCheck: true },
};
