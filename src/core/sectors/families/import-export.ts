// Import and export. Data only. No numbers, no benchmarks. See docs/design/sector-model.md.
import type { SectorFamily } from "../types";

export const importExport: SectorFamily = {
  id: "import-export",
  name: { en: "Import and export", bn: "আমদানি ও রপ্তানি" },
  summary: {
    en: "Buys goods from abroad or sells abroad, with LC, customs, freight and currency changes. Landed cost and cash locked in transit matter most. Rules and licences are a question to check, not advice.",
    bn: "বিদেশ থেকে মাল আনা বা বিদেশে বিক্রি, এলসি, কাস্টমস, ফ্রেইট আর কারেন্সির ওঠানামা সহ। মাল দেশে পৌঁছানো পর্যন্ত মোট খরচ আর পথে আটকে থাকা টাকা সবচেয়ে জরুরি। নিয়ম ও লাইসেন্স দেখে নেওয়ার প্রশ্ন, পরামর্শ নয়।",
  },
  aliases: {
    en: ["import", "export", "importer", "exporter", "lc", "letter of credit", "c and f", "customs", "freight", "sourcing agent"],
    bn: ["আমদানি", "রপ্তানি", "এলসি", "কাস্টমস", "সি অ্যান্ড এফ", "ফ্রেইট", "সোর্সিং"],
  },
  inputs: [
    { id: "goodsCost", label: { en: "Cost of goods at the supplier, in taka", bn: "সাপ্লায়ারের কাছে মালের দাম, টাকায়" }, unit: "money", perPeriod: false, required: true },
    { id: "freight", label: { en: "Freight and insurance for the shipment", bn: "শিপমেন্টের ফ্রেইট ও ইনস্যুরেন্স" }, unit: "money", perPeriod: false, required: true },
    { id: "duties", label: { en: "Customs duty, tax and port charges you paid", bn: "আপনার দেওয়া কাস্টমস ডিউটি, ট্যাক্স ও পোর্ট চার্জ" }, unit: "money", perPeriod: false, required: true },
    { id: "bankCharges", label: { en: "Bank, LC and agent charges", bn: "ব্যাংক, এলসি ও এজেন্টের চার্জ" }, unit: "money", perPeriod: false },
    { id: "unitsReceived", label: { en: "Units received in good order", bn: "ঠিকঠাক পাওয়া ইউনিট" }, unit: "qty", perPeriod: false },
    { id: "unitsOrdered", label: { en: "Units ordered and shipped", bn: "অর্ডার করা ও পাঠানো ইউনিট" }, unit: "qty", perPeriod: false },
    { id: "price", label: { en: "Selling price per unit", bn: "প্রতি ইউনিটের বিক্রির দাম" }, unit: "money", perPeriod: false },
    { id: "varCost", label: { en: "Full landed cost per unit", bn: "প্রতি ইউনিটের পুরো খরচ, গোডাউনে পৌঁছানো পর্যন্ত" }, unit: "money", perPeriod: false },
    { id: "fixed", label: { en: "Fixed costs for the month (office, staff, warehouse)", bn: "মাসের ফিক্সড খরচ (অফিস, স্টাফ, গোডাউন)" }, unit: "money", perPeriod: true },
    { id: "revenue", label: { en: "Sales for the month", bn: "মাসের মোট বিক্রি" }, unit: "money", perPeriod: true },
    { id: "cogs", label: { en: "Landed cost of goods sold in the month", bn: "মাসে বিক্রি হওয়া মালের পুরো খরচ" }, unit: "money", perPeriod: true },
    { id: "inventory", label: { en: "Stock in godown and in transit, at cost", bn: "গোডাউন ও পথে থাকা স্টক, খরচ দামে" }, unit: "money", perPeriod: false },
    { id: "receivables", label: { en: "Money buyers still owe you", bn: "বায়ারের কাছে বাকি পাওনা" }, unit: "money", perPeriod: false },
    { id: "payables", label: { en: "Money you still owe suppliers and the bank", bn: "সাপ্লায়ার ও ব্যাংককে বাকি দেনা" }, unit: "money", perPeriod: false },
    { id: "periodDays", label: { en: "Days in the month you are counting", bn: "যে মাসের হিসাব করছেন তার দিন সংখ্যা" }, unit: "days", perPeriod: true },
  ],
  formulas: [
    { id: "landedTotal", name: { en: "Total landed cost of the shipment", bn: "শিপমেন্টের মোট খরচ, পৌঁছানো পর্যন্ত" }, expr: "goodsCost + freight + duties + bankCharges", needs: ["goodsCost", "freight", "duties", "bankCharges"], result: "money" },
    { id: "landedPerUnit", name: { en: "Landed cost per unit received", bn: "পাওয়া প্রতি ইউনিটের পুরো খরচ" }, expr: "(goodsCost + freight + duties + bankCharges) / unitsReceived", needs: ["goodsCost", "freight", "duties", "bankCharges", "unitsReceived"], result: "money" },
    { id: "shortfall", name: { en: "Share of units lost or damaged", bn: "হারানো বা নষ্ট ইউনিটের অংশ" }, use: "lossRate", map: { outputQty: "unitsReceived", inputQty: "unitsOrdered" } },
    { id: "unitMargin", use: "contributionMargin", map: { price: "price", varCost: "varCost" } },
    { id: "breakEvenUnits", use: "breakEvenUnits", map: { fixed: "fixed", price: "price", varCost: "varCost" } },
    { id: "grossMarginMonth", use: "grossMargin", map: { revenue: "revenue", cogs: "cogs" } },
    { id: "cashDays", use: "cashConversion", map: { receivables: "receivables", inventory: "inventory", payables: "payables", revenue: "revenue", cogs: "cogs", periodDays: "periodDays" } },
    { id: "stockDays", use: "inventoryDays", map: { inventory: "inventory", cogs: "cogs", periodDays: "periodDays" } },
  ],
  questions: [
    { en: "Which licences, registrations and customs rules apply to this product, and who confirmed them?", bn: "এই পণ্যের জন্য কোন লাইসেন্স, রেজিস্ট্রেশন ও কাস্টমসের নিয়ম প্রযোজ্য, আর কে তা নিশ্চিত করেছে?" },
    { en: "How long is your money locked from paying the supplier until the buyer pays you?", bn: "সাপ্লায়ারকে টাকা দেওয়া থেকে বায়ার আপনাকে টাকা দেওয়া পর্যন্ত আপনার টাকা কত দিন আটকে থাকে?" },
    { en: "If the dollar rate moves before you pay, can you still cover the cost?", bn: "পেমেন্টের আগে ডলারের রেট বদলালে কি খরচ সামলাতে পারবেন?" },
    { en: "Do you have a second supplier or buyer if one fails?", bn: "একজন ফেল করলে দ্বিতীয় সাপ্লায়ার বা বায়ার আছে কি?" },
  ],
  risks: [
    { en: "Currency rate moving between order and payment.", bn: "অর্ডার ও পেমেন্টের মাঝে কারেন্সির রেট বদলে যাওয়া।" },
    { en: "Shipment held at port, with storage and delay charges adding up.", bn: "শিপমেন্ট পোর্টে আটকে গিয়ে স্টোরেজ ও দেরির চার্জ বাড়া।" },
    { en: "Goods that do not match the order or are damaged in transit.", bn: "অর্ডারের সাথে না মেলা বা পথে নষ্ট হওয়া মাল।" },
    { en: "Rule or duty changes that raise cost after you have committed.", bn: "চুক্তির পর নিয়ম বা ডিউটি বদলে খরচ বেড়ে যাওয়া।" },
    { en: "Buyer not paying after the goods are shipped.", bn: "মাল পাঠানোর পর বায়ার টাকা না দেওয়া।" },
  ],
  seasonal: true,
  related: { paths: [], halalCheck: true },
};
